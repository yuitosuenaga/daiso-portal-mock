// 実PostgreSQLでの担当(claim)・状態変更の同時実行の統合テスト（競合制御と履歴の原子性）。
// INQUIRY_TEST_DATABASE_URL（使い捨てローカルDB。マイグレーション適用済み）がある時のみ実行する。
// 他の統合テスト（helpdesk-staff-service は beforeEach で helpdeskStaff.deleteMany({}) する）と
// 並列に動くと claim が SetNull で消えるため、必ず --no-file-parallelism で実行すること。
// 実測では同時 claim のテストが不安定になる（状態変更系も理論上は巻き込まれ得る）。
// CI は --no-file-parallelism で実行する。
// 例: docker run -d --rm --name inquiry-it -e POSTGRES_PASSWORD=test -p 127.0.0.1:5598:5432 postgres:16
//     DATABASE_URL=postgresql://postgres:test@127.0.0.1:5598/postgres npx prisma migrate deploy
//     INQUIRY_TEST_DATABASE_URL=postgresql://postgres:test@127.0.0.1:5598/postgres \
//       npx vitest run integration --no-file-parallelism
//     docker rm -f inquiry-it
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

const url = process.env.INQUIRY_TEST_DATABASE_URL;
const testPrisma = url ? new PrismaClient({ datasources: { db: { url } } }) : null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return testPrisma;
  },
}));

// company-service が auth-session（next-auth）を import するため、認可は本テストの対象外としてモックする。
vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskAdminSession: vi.fn(),
  requireHelpdeskStaffSession: vi.fn(),
}));

import {
  appendReplyWithAutoTransition,
  changeStatusWithHistory,
  ClaimOwnershipError,
  DoubleClaimError,
  InquiryNotFoundError,
  setClaim,
} from "@/lib/server/inquiry-service";

describe.skipIf(!url)("問い合わせのclaim・状態変更の同時実行（実DB）", () => {
  const created = {
    inquiryIds: [] as string[],
    staffIds: [] as string[],
    companyIds: [] as string[],
  };
  let inquiryId = "";
  let staffA = { id: "", displayName: "A" };
  let staffB = { id: "", displayName: "B" };

  const suffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  beforeEach(async () => {
    const s = suffix();
    const company = await testPrisma!.company.create({
      data: { name: "IT Co.", country: "JP", companyCode: `it-${s}` },
    });
    created.companyIds.push(company.id);
    const a = await testPrisma!.helpdeskStaff.create({
      data: { email: `inq-it-a-${s}@example.com`, displayName: "A", role: "member" },
    });
    const b = await testPrisma!.helpdeskStaff.create({
      data: { email: `inq-it-b-${s}@example.com`, displayName: "B", role: "member" },
    });
    created.staffIds.push(a.id, b.id);
    staffA = { id: a.id, displayName: "A" };
    staffB = { id: b.id, displayName: "B" };
    const inquiry = await testPrisma!.inquiry.create({
      data: {
        title: "it",
        category: "defect",
        urgency: "high",
        storeRegion: "Kanto",
        originalText: "text",
        originalLanguage: "ja",
        companyId: company.id,
        submittedByCompanyName: company.name,
        submittedByCountry: company.country,
      },
    });
    created.inquiryIds.push(inquiry.id);
    inquiryId = inquiry.id;
  });

  // 作ったIDだけを history → inquiry → staff → company の順で削除する（全件削除はしない）。
  afterEach(async () => {
    const { inquiryIds, staffIds, companyIds } = created;
    await testPrisma!.inquiryHistoryEntry.deleteMany({ where: { inquiryId: { in: inquiryIds } } });
    await testPrisma!.inquiry.deleteMany({ where: { id: { in: inquiryIds } } });
    await testPrisma!.helpdeskStaff.deleteMany({ where: { id: { in: staffIds } } });
    await testPrisma!.company.deleteMany({ where: { id: { in: companyIds } } });
    inquiryIds.length = staffIds.length = companyIds.length = 0;
  });

  afterAll(async () => {
    await testPrisma?.$disconnect();
  });

  const historyOf = (type: string) =>
    testPrisma!.inquiryHistoryEntry.findMany({ where: { inquiryId, type: type as never } });

  it("同時claimは1件だけ成功し、負けた側はDoubleClaimErrorで履歴はclaimed 1件のみ", async () => {
    const results = await Promise.allSettled([
      setClaim(inquiryId, { staffId: staffA.id, displayName: "A" }, staffA.id, {
        historyActorName: "A",
      }),
      setClaim(inquiryId, { staffId: staffB.id, displayName: "B" }, staffB.id, {
        historyActorName: "B",
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(DoubleClaimError);

    const winnerIndex = results.findIndex((r) => r.status === "fulfilled");
    const winner = winnerIndex === 0 ? staffA : staffB;
    const row = await testPrisma!.inquiry.findUniqueOrThrow({ where: { id: inquiryId } });
    expect(row.claimedByStaffId).toBe(winner.id);
    const claimed = await historyOf("claimed");
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.actorName).toBe(winner.displayName);
  });

  it("オーナーによる同時解除は両方成功し、released履歴は1件でclaimはnull", async () => {
    await setClaim(inquiryId, { staffId: staffA.id, displayName: "A" }, staffA.id);

    const results = await Promise.allSettled([
      setClaim(inquiryId, null, staffA.id, { historyActorName: "A" }),
      setClaim(inquiryId, null, staffA.id, { historyActorName: "A" }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    expect(await historyOf("released")).toHaveLength(1);
    const row = await testPrisma!.inquiry.findUniqueOrThrow({ where: { id: inquiryId } });
    expect(row.claimedByStaffId).toBeNull();
  });

  describe("無効化されたスタッフが担当中の解除", () => {
    let staffC = { id: "", displayName: "C" };

    beforeEach(async () => {
      const c = await testPrisma!.helpdeskStaff.create({
        data: { email: `inq-it-c-${suffix()}@example.com`, displayName: "C", role: "member" },
      });
      created.staffIds.push(c.id);
      staffC = { id: c.id, displayName: "C" };
    });

    it("担当者Aが無効化された後、Bの解除が成功しclaimはnull・released履歴は1件(実行者B)", async () => {
      await setClaim(inquiryId, { staffId: staffA.id, displayName: "A" }, staffA.id);
      await testPrisma!.helpdeskStaff.update({
        where: { id: staffA.id },
        data: { isActive: false },
      });

      await setClaim(inquiryId, null, staffB.id, { historyActorName: "B" });

      const row = await testPrisma!.inquiry.findUniqueOrThrow({ where: { id: inquiryId } });
      expect(row.claimedByStaffId).toBeNull();
      const released = await historyOf("released");
      expect(released).toHaveLength(1);
      expect(released[0]?.actorName).toBe("B");
    });

    it("BとCの同時解除は両方成功し、released履歴は1件", async () => {
      await setClaim(inquiryId, { staffId: staffA.id, displayName: "A" }, staffA.id);
      await testPrisma!.helpdeskStaff.update({
        where: { id: staffA.id },
        data: { isActive: false },
      });

      const results = await Promise.allSettled([
        setClaim(inquiryId, null, staffB.id, { historyActorName: "B" }),
        setClaim(inquiryId, null, staffC.id, { historyActorName: "C" }),
      ]);

      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
      expect(await historyOf("released")).toHaveLength(1);
      const row = await testPrisma!.inquiry.findUniqueOrThrow({ where: { id: inquiryId } });
      expect(row.claimedByStaffId).toBeNull();
    });

    it("担当者Aが有効なままなら、Bの解除はClaimOwnershipError", async () => {
      await setClaim(inquiryId, { staffId: staffA.id, displayName: "A" }, staffA.id);

      await expect(
        setClaim(inquiryId, null, staffB.id, { historyActorName: "B" })
      ).rejects.toBeInstanceOf(ClaimOwnershipError);

      const row = await testPrisma!.inquiry.findUniqueOrThrow({ where: { id: inquiryId } });
      expect(row.claimedByStaffId).toBe(staffA.id);
      expect(await historyOf("released")).toHaveLength(0);
    });
  });

  const formatDetail = (prev: string, next: string) => `${prev}>${next}`;

  it("同時の状態変更は両方成功し、履歴の変更前が実際の遷移と連続する", async () => {
    const results = await Promise.allSettled([
      changeStatusWithHistory(inquiryId, "resolved", { actorName: "A", formatDetail }),
      changeStatusWithHistory(inquiryId, "in_progress", { actorName: "B", formatDetail }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    const entries = await historyOf("status_changed");
    expect(entries).toHaveLength(2);
    const details = entries.map((e) => (e.detail ?? "").split(">") as [string, string]);
    const first = details.find(([prev]) => prev === "new");
    expect(first).toBeDefined();
    const second = details.find((d) => d !== first);
    expect(second?.[0]).toBe(first?.[1]);
    const row = await testPrisma!.inquiry.findUniqueOrThrow({ where: { id: inquiryId } });
    expect(row.status).toBe(second?.[1]);
  });

  it("同じ状態への同時変更は履歴を1件だけ残す", async () => {
    const results = await Promise.all([
      changeStatusWithHistory(inquiryId, "resolved", { actorName: "A", formatDetail }),
      changeStatusWithHistory(inquiryId, "resolved", { actorName: "B", formatDetail }),
    ]);

    expect(results.filter((r) => r.changed)).toHaveLength(1);
    expect(await historyOf("status_changed")).toHaveLength(1);
  });

  it("存在しないIDはInquiryNotFoundError（返信でもFK違反にならない）", async () => {
    await expect(
      changeStatusWithHistory("missing-id", "resolved", { actorName: "A", formatDetail })
    ).rejects.toBeInstanceOf(InquiryNotFoundError);
    await expect(
      appendReplyWithAutoTransition("missing-id", {
        actorName: "A",
        body: "b",
        autoTransitionDetail: "d",
      })
    ).rejects.toBeInstanceOf(InquiryNotFoundError);
    await expect(
      setClaim("missing-id", { staffId: staffA.id, displayName: "A" }, staffA.id)
    ).rejects.toBeInstanceOf(InquiryNotFoundError);
  });
  // 履歴 create を確実に失敗させる: PostgreSQL の text は NUL 文字(\u0000)を保存できない。
  // 返信は reply_sent 履歴(成功)→ status_changed 履歴(detailがNULで失敗)の順に作るため、
  // 履歴が tx 外で作られていると reply_sent が残り、tx 内ならすべてロールバックされる。
  // （claim・状態変更は履歴createが tx 内の最後の書き込みなので、この方法では tx 外化を検出できない。
  //  それらはユニットテスト inquiry-service.tx.test.ts で検証する。）
  it("返信の2件目の履歴作成が失敗したら、返信履歴と自動遷移もロールバックされる", async () => {
    await expect(
      appendReplyWithAutoTransition(inquiryId, {
        actorName: "A",
        body: "b",
        autoTransitionDetail: "bad\u0000detail",
      })
    ).rejects.toThrow();
    const row = await testPrisma!.inquiry.findUniqueOrThrow({ where: { id: inquiryId } });
    expect(row.status).toBe("new");
    expect(await historyOf("reply_sent")).toHaveLength(0);
    expect(await historyOf("status_changed")).toHaveLength(0);
  });
});
