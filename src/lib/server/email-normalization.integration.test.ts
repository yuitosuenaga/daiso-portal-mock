// 実PostgreSQLでのメール正規化（大文字小文字非区別の重複判定・ログイン照合・Google照合）の統合テスト。
// Prismaの`mode: "insensitive"`+`equals`がILIKEになる場合に`_`・`%`がワイルドカードとして効かないこと
// （例: a_b@x.com が axb@x.com に一致しないこと）も実DBで固定する。
// EMAIL_TEST_DATABASE_URL（使い捨てローカルDB。マイグレーション適用済み）がある時のみ実行する。
// 他の統合テスト（helpdesk-staff-service は helpdeskStaff.deleteMany({}) する）と干渉しないよう、
// CI と同じく --no-file-parallelism で実行すること。後片付けは本テストが作った id だけを削除する。
// 例: docker run -d --rm --name email-it -e POSTGRES_PASSWORD=test -p 127.0.0.1:5596:5432 postgres:16
//     DATABASE_URL=postgresql://postgres:test@127.0.0.1:5596/postgres npx prisma migrate deploy
//     EMAIL_TEST_DATABASE_URL=postgresql://postgres:test@127.0.0.1:5596/postgres \
//       npx vitest run integration --no-file-parallelism
//     docker rm -f email-it
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

const url = process.env.EMAIL_TEST_DATABASE_URL;
const testPrisma = url ? new PrismaClient({ datasources: { db: { url } } }) : null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return testPrisma;
  },
}));

// next-auth を読み込む import があっても落ちないよう、認可は本テストの対象外としてモックする。
vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskAdminSession: vi.fn(),
  requireHelpdeskStaffSession: vi.fn(),
}));

import {
  authorizeApplicantCredentials,
  authorizeHelpdeskCredentials,
} from "@/lib/server/authorize";
import { authorizeGoogleLogin } from "@/lib/server/google-authorize";
import {
  createApplicantUser,
  isApplicantUserEmailTaken,
} from "@/lib/server/applicant-user-service";

// 実行ごとに一意なローカル部にして、他データ・過去の残骸と衝突しないようにする。
const sfx = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const em = (local: string) => `${local}-${sfx}@email-it.example.com`;
const PASSWORD = "password-it-1234";

const googleBase = {
  emailVerified: true,
  allowedDomains: ["email-it.example.com"],
  hostedDomain: undefined,
  name: undefined,
  autoProvisionDomains: [] as string[],
};

describe.skipIf(!url)("メール正規化（実DB）", () => {
  const applicantIds: string[] = [];
  const staffIds: string[] = [];
  let companyId = "";
  let hash = "";

  async function addApplicant(email: string, createdAt?: Date) {
    const row = await testPrisma!.applicantUser.create({
      data: { email, passwordHash: hash, displayName: "IT", companyId, createdAt },
    });
    applicantIds.push(row.id);
    return row;
  }
  async function addStaff(email: string, createdAt?: Date) {
    const row = await testPrisma!.helpdeskStaff.create({
      data: { email, passwordHash: hash, displayName: "IT", createdAt },
    });
    staffIds.push(row.id);
    return row;
  }

  beforeAll(async () => {
    hash = await bcrypt.hash(PASSWORD, 4);
    const company = await testPrisma!.company.create({
      data: { name: "Email IT", country: "JP", companyCode: `email-it-${sfx}` },
    });
    companyId = company.id;
  });

  afterAll(async () => {
    if (!testPrisma) return;
    await testPrisma.applicantUser.deleteMany({ where: { id: { in: applicantIds } } });
    await testPrisma.helpdeskStaff.deleteMany({ where: { id: { in: staffIds } } });
    if (companyId) await testPrisma.company.deleteMany({ where: { id: companyId } });
    await testPrisma.$disconnect();
  });

  it("大文字小文字だけ違う申請者の登録は重複として拒否される（createApplicantUser側も小文字保存）", async () => {
    const created = await createApplicantUser(companyId, {
      email: ` ${em("Dup1")} `,
      displayName: "IT",
      password: PASSWORD,
      preferredLocale: "en",
    });
    applicantIds.push(created.id);
    expect(created.email).toBe(em("dup1"));

    expect(await isApplicantUserEmailTaken(em("DUP1"))).toBe(true);
    expect(await isApplicantUserEmailTaken(em("dup1"))).toBe(true);
    // 自分自身を除外すれば重複ではない
    expect(await isApplicantUserEmailTaken(em("Dup1"), created.id)).toBe(false);
  });

  it("スタッフと大文字小文字違いのメールも重複として拒否される", async () => {
    await addStaff(em("staff1"));
    expect(await isApplicantUserEmailTaken(em("Staff1"))).toBe(true);
  });

  it("ワイルドカード: _ や % を含む入力が、別のメールにヒットしない（照会の入力側・保存値側の両方向）", async () => {
    // 保存値 axb / sxt / pzzq に対し、入力 a_b / s_t / p%q がLIKEパターンとして効かないこと
    await addApplicant(em("axb"));
    await addStaff(em("sxt"));
    await addApplicant(em("pzzq"));
    expect(await isApplicantUserEmailTaken(em("a_b"))).toBe(false);
    expect(await isApplicantUserEmailTaken(em("s_t"))).toBe(false);
    expect(await isApplicantUserEmailTaken(em("p%q"))).toBe(false);
    expect(await authorizeApplicantCredentials(em("a_b"), PASSWORD)).toBeNull();
    expect(await authorizeApplicantCredentials(em("p%q"), PASSWORD)).toBeNull();
    expect(await authorizeHelpdeskCredentials(em("s_t"), PASSWORD)).toBeNull();
    expect(
      await authorizeGoogleLogin({ ...googleBase, email: em("a_b"), portal: "applicant" })
    ).toEqual({ ok: false, error: "not_registered" });
    expect(
      await authorizeGoogleLogin({ ...googleBase, email: em("s_t"), portal: "helpdesk" })
    ).toEqual({ ok: false, error: "not_registered" });

    // 保存値 a_b / s_t / p%q に対し、入力 axb 系は重複にもログインにもならない（逆方向）
    await addApplicant(em("a_b"));
    await addStaff(em("s_t"));
    await addApplicant(em("p%q"));
    // axb 等は上で登録済みなので、別の綴り（a-b ではなく a1b）で確認する
    expect(await isApplicantUserEmailTaken(em("a1b"))).toBe(false);
    expect(await authorizeApplicantCredentials(em("a1b"), PASSWORD)).toBeNull();
    expect(await authorizeHelpdeskCredentials(em("s1t"), PASSWORD)).toBeNull();

    // 本物のメール（記号入り）は照合できる
    expect(await isApplicantUserEmailTaken(em("a_b"))).toBe(true);
    expect((await authorizeApplicantCredentials(em("A_B"), PASSWORD))?.role).toBe("applicant");
    expect((await authorizeHelpdeskCredentials(em("s_t"), PASSWORD))?.role).toBe("helpdesk");
  });

  it("大文字で保存された既存行に、小文字・大文字違いの入力でログインできる", async () => {
    const a = await addApplicant(em("Legacy1"));
    const s = await addStaff(em("Legacy2"));

    expect((await authorizeApplicantCredentials(em("legacy1"), PASSWORD))?.id).toBe(a.id);
    expect((await authorizeApplicantCredentials(`  ${em("LEGACY1")}`, PASSWORD))?.id).toBe(a.id);
    expect((await authorizeHelpdeskCredentials(em("legacy2"), PASSWORD))?.id).toBe(s.id);
    const g = await authorizeGoogleLogin({ ...googleBase, email: em("LEGACY1"), portal: "applicant" });
    expect(g.ok && g.user.id).toBe(a.id);
  });

  it("重複データ: 小文字と一致する行があればその行、無ければ拒否する（パスワード・Google・スタッフ）", async () => {
    const old = new Date("2020-01-01T00:00:00Z");
    const upper = await addApplicant(em("Both1"), old);
    const lower = await addApplicant(em("both1"));
    expect((await authorizeApplicantCredentials(em("both1"), PASSWORD))?.id).toBe(lower.id);
    expect((await authorizeApplicantCredentials(em("Both1"), PASSWORD))?.id).toBe(upper.id);
    // 入力が、どちらとも完全一致しない
    expect(await authorizeApplicantCredentials(em("BOTH1"), PASSWORD)).toBeNull();
    // Googleは小文字化した値と完全一致する行（lower）を、createdAtが古い大文字行より優先する
    const g = await authorizeGoogleLogin({ ...googleBase, email: em("Both1"), portal: "applicant" });
    expect(g.ok && g.user.id).toBe(lower.id);

    // 小文字行が無い重複（Both2 / BOTH2）は、パスワードもGoogleも拒否
    await addApplicant(em("Both2"), old);
    await addApplicant(em("BOTH2"));
    expect(await authorizeApplicantCredentials(em("both2"), PASSWORD)).toBeNull();
    expect(
      await authorizeGoogleLogin({ ...googleBase, email: em("both2"), portal: "applicant" })
    ).toEqual({ ok: false, error: "not_registered" });

    // スタッフ側
    const sUpper = await addStaff(em("Both3"), old);
    const sLower = await addStaff(em("both3"));
    expect((await authorizeHelpdeskCredentials(em("both3"), PASSWORD))?.id).toBe(sLower.id);
    expect((await authorizeHelpdeskCredentials(em("Both3"), PASSWORD))?.id).toBe(sUpper.id);
    await addStaff(em("Both4"), old);
    await addStaff(em("BOTH4"));
    expect(await authorizeHelpdeskCredentials(em("both4"), PASSWORD)).toBeNull();
    expect(
      await authorizeGoogleLogin({ ...googleBase, email: em("both4"), portal: "helpdesk" })
    ).toEqual({ ok: false, error: "not_registered" });
  });
});
