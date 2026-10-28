// 実PostgreSQLでの販社の一括登録（createCompaniesBulk）の統合テスト。
// 行数に比例してクエリが増えない（INSERTが2本に固定）こと、500行を対話型トランザクションの
// 既定タイムアウト（5秒）内で登録できること、販社コード競合（P2002）が
// CompanyCodeTakenError になり全件ロールバックされることを、モックではなく実DBで固定する。
// COMPANY_TEST_DATABASE_URL（使い捨てローカルDB。マイグレーション適用済み）がある時のみ実行する。
// 他の統合テストと干渉しないよう、CI と同じく --no-file-parallelism で実行すること。
// 後片付けは本テストのコード接頭辞（bulk-it-）に一致する行だけを削除する（全件削除しない）。
// 例: docker run -d --rm --name company-it -e POSTGRES_PASSWORD=test -p 127.0.0.1:5611:5432 postgres:16
//     DATABASE_URL=postgresql://postgres:test@127.0.0.1:5611/postgres npx prisma migrate deploy
//     COMPANY_TEST_DATABASE_URL=postgresql://postgres:test@127.0.0.1:5611/postgres \
//       npx vitest run integration --no-file-parallelism
//     docker rm -f company-it
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

const url = process.env.COMPANY_TEST_DATABASE_URL;
const testPrisma = url
  ? new PrismaClient({
      datasources: { db: { url } },
      log: [{ emit: "event", level: "query" }],
    })
  : null;

const executedQueries: string[] = [];
testPrisma?.$on("query", (event) => {
  executedQueries.push(event.query);
});

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

import { MAX_COMPANY_CSV_ROWS } from "@/lib/company-csv";
import { CompanyCodeTakenError, createCompaniesBulk } from "@/lib/server/company-service";

const CODE_PREFIX = "bulk-it-";

function buildInputs(count: number, prefix = CODE_PREFIX) {
  return Array.from({ length: count }, (_, i) => ({
    name: `Bulk IT Company ${i + 1}`,
    country: "TH",
    companyCode: `${prefix}${i + 1}`,
  }));
}

function insertQueries(): string[] {
  return executedQueries.filter((query) => /^\s*INSERT\b/i.test(query));
}

describe.skipIf(!url)("販社の一括登録（実DB）", () => {
  async function cleanup() {
    if (!testPrisma) return;
    const companies = await testPrisma.company.findMany({
      where: { companyCode: { startsWith: CODE_PREFIX } },
      select: { id: true },
    });
    const ids = companies.map((company) => company.id);
    await testPrisma.announcementRecipient.deleteMany({ where: { companyId: { in: ids } } });
    await testPrisma.company.deleteMany({ where: { id: { in: ids } } });
  }

  afterEach(async () => {
    executedQueries.length = 0;
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await testPrisma?.$disconnect();
  });

  it("上限行数を、行数に関係なくINSERT2本（Company・AnnouncementRecipient各1本）・5秒未満で登録する", async () => {
    executedQueries.length = 0;
    const startedAt = Date.now();

    const created = await createCompaniesBulk(buildInputs(MAX_COMPANY_CSV_ROWS));

    const elapsedMs = Date.now() - startedAt;
    expect(created).toHaveLength(MAX_COMPANY_CSV_ROWS);
    expect(insertQueries().length).toBeLessThanOrEqual(2);
    expect(elapsedMs).toBeLessThan(5000);

    const companyCount = await testPrisma!.company.count({
      where: { companyCode: { startsWith: CODE_PREFIX } },
    });
    const recipientCount = await testPrisma!.announcementRecipient.count({
      where: { company: { companyCode: { startsWith: CODE_PREFIX } } },
    });
    expect(companyCount).toBe(MAX_COMPANY_CSV_ROWS);
    expect(recipientCount).toBe(MAX_COMPANY_CSV_ROWS);
  });

  it("各AnnouncementRecipientが対応するCompanyの会社名をcontactNameに持つ", async () => {
    await createCompaniesBulk(buildInputs(20));

    const recipients = await testPrisma!.announcementRecipient.findMany({
      where: { company: { companyCode: { startsWith: CODE_PREFIX } } },
      include: { company: true },
    });
    expect(recipients).toHaveLength(20);
    for (const recipient of recipients) {
      expect(recipient.contactName).toBe(recipient.company.name);
    }
  });

  it("既存の販社コードと衝突するとCompanyCodeTakenErrorになり、全件ロールバックされる", async () => {
    await testPrisma!.company.create({
      data: { name: "Existing", country: "TH", companyCode: `${CODE_PREFIX}existing` },
    });

    const inputs = [
      ...buildInputs(5),
      { name: "Conflict", country: "TH", companyCode: `${CODE_PREFIX}existing` },
    ];

    await expect(createCompaniesBulk(inputs)).rejects.toBeInstanceOf(CompanyCodeTakenError);

    const companies = await testPrisma!.company.findMany({
      where: { companyCode: { startsWith: CODE_PREFIX } },
    });
    expect(companies.map((company) => company.companyCode)).toEqual([`${CODE_PREFIX}existing`]);
    expect(
      await testPrisma!.announcementRecipient.count({
        where: { company: { companyCode: { startsWith: CODE_PREFIX } } },
      })
    ).toBe(0);
  });
});
