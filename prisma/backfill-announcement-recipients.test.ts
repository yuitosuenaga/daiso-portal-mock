import { describe, expect, it, vi } from "vitest";

import { backfillAnnouncementRecipients } from "./backfill-announcement-recipients";

interface FakeCompany {
  id: string;
  name: string;
  companyCode: string;
}

function fakePrisma(companiesMissingRecipients: FakeCompany[]) {
  const findMany = vi.fn().mockResolvedValue(companiesMissingRecipients);
  const create = vi.fn().mockResolvedValue(undefined);

  return {
    company: { findMany },
    announcementRecipient: { create },
  };
}

describe("backfillAnnouncementRecipients", () => {
  it("AnnouncementRecipientを1件も持たないCompanyを抽出し、各社に1件補完する（要件13.1・13.3）", async () => {
    const prisma = fakePrisma([
      { id: "company-1", name: "Alpha Trading Co.", companyCode: "alpha-trading" },
      { id: "company-2", name: "Beta Trading Co.", companyCode: "beta-trading" },
    ]);

    const result = await backfillAnnouncementRecipients(prisma as never);

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: { announcementRecipients: { none: {} } },
      orderBy: { name: "asc" },
    });
    expect(prisma.announcementRecipient.create).toHaveBeenCalledTimes(2);
    expect(prisma.announcementRecipient.create).toHaveBeenNthCalledWith(1, {
      data: { companyId: "company-1", contactName: "Alpha Trading Co." },
    });
    expect(prisma.announcementRecipient.create).toHaveBeenNthCalledWith(2, {
      data: { companyId: "company-2", contactName: "Beta Trading Co." },
    });
    expect(result.backfilledCompanyCodes).toEqual(["alpha-trading", "beta-trading"]);
  });

  it("補完対象のCompanyが0件のとき、announcementRecipient.createを一切呼び出さない（冪等・要件13.2）", async () => {
    const prisma = fakePrisma([]);

    const result = await backfillAnnouncementRecipients(prisma as never);

    expect(prisma.announcementRecipient.create).not.toHaveBeenCalled();
    expect(result.backfilledCompanyCodes).toEqual([]);
  });

  it("同じ抽出条件で複数回実行しても、既に担当者を持つCompanyには重複してレコードを作らない（冪等・要件13.2）", async () => {
    // 1回目実行: 担当者0件のCompanyが1社
    const firstRunPrisma = fakePrisma([
      { id: "company-1", name: "Gamma Trading Co.", companyCode: "gamma-trading" },
    ]);
    await backfillAnnouncementRecipients(firstRunPrisma as never);
    expect(firstRunPrisma.announcementRecipient.create).toHaveBeenCalledTimes(1);

    // 2回目実行: 1回目の補完によりCompanyは`announcementRecipients: { none: {} }`の
    // 抽出条件にもう合致しないため、findManyが返す対象は0件になる（実DBのwhere句が
    // 保証する冪等性をシミュレート）。
    const secondRunPrisma = fakePrisma([]);
    const result = await backfillAnnouncementRecipients(secondRunPrisma as never);

    expect(secondRunPrisma.announcementRecipient.create).not.toHaveBeenCalled();
    expect(result.backfilledCompanyCodes).toEqual([]);
  });
});
