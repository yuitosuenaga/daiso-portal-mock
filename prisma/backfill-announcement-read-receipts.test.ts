import { describe, expect, it, vi } from "vitest";

import { backfillAnnouncementReadReceipts } from "./backfill-announcement-read-receipts";

interface FakeConfirmedStatusRow {
  announcementId: string;
  companyId: string;
  confirmedAt: Date;
}

interface FakeApplicantUser {
  id: string;
  companyId: string;
  isActive: boolean;
}

function fakePrisma(
  confirmedStatusRows: FakeConfirmedStatusRow[],
  applicantUsersByCompanyId: Record<string, FakeApplicantUser[]>,
  existingReceiptKeys: string[] = []
) {
  const queryRaw = vi.fn().mockResolvedValue(confirmedStatusRows);
  const applicantUserFindMany = vi.fn(
    async ({ where }: { where: { companyId: string; isActive: boolean } }) =>
      (applicantUsersByCompanyId[where.companyId] ?? []).filter((user) => user.isActive)
  );
  const receiptFindUnique = vi.fn(
    async ({
      where,
    }: {
      where: { announcementId_applicantUserId: { announcementId: string; applicantUserId: string } };
    }) => {
      const key = `${where.announcementId_applicantUserId.announcementId}:${where.announcementId_applicantUserId.applicantUserId}`;
      return existingReceiptKeys.includes(key) ? { id: `receipt-${key}` } : null;
    }
  );
  const receiptCreate = vi.fn().mockResolvedValue(undefined);

  return {
    $queryRaw: queryRaw,
    applicantUser: { findMany: applicantUserFindMany },
    announcementReadReceipt: { findUnique: receiptFindUnique, create: receiptCreate },
  };
}

describe("backfillAnnouncementReadReceipts", () => {
  it("会社単位で確認済みの行を、当該会社の有効な全ApplicantUserへキャリーフォワードする（要件41.2）", async () => {
    const confirmedAt = new Date("2026-07-01T00:00:00.000Z");
    const prisma = fakePrisma(
      [{ announcementId: "ann-1", companyId: "company-1", confirmedAt }],
      {
        "company-1": [
          { id: "user-1", companyId: "company-1", isActive: true },
          { id: "user-2", companyId: "company-1", isActive: true },
        ],
      }
    );

    const backfillResult = await backfillAnnouncementReadReceipts(prisma as never);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.applicantUser.findMany).toHaveBeenCalledWith({
      where: { companyId: "company-1", isActive: true },
    });
    expect(prisma.announcementReadReceipt.create).toHaveBeenCalledTimes(2);
    expect(prisma.announcementReadReceipt.create).toHaveBeenCalledWith({
      data: { announcementId: "ann-1", applicantUserId: "user-1", confirmedAt },
    });
    expect(prisma.announcementReadReceipt.create).toHaveBeenCalledWith({
      data: { announcementId: "ann-1", applicantUserId: "user-2", confirmedAt },
    });
    expect(backfillResult.backfilledCount).toBe(2);
  });

  it("無効化済み（isActive: false）のApplicantUserはキャリーフォワード対象から除外する", async () => {
    const confirmedAt = new Date("2026-07-01T00:00:00.000Z");
    const prisma = fakePrisma(
      [{ announcementId: "ann-1", companyId: "company-1", confirmedAt }],
      {
        "company-1": [
          { id: "user-1", companyId: "company-1", isActive: true },
          { id: "user-2", companyId: "company-1", isActive: false },
        ],
      }
    );

    await backfillAnnouncementReadReceipts(prisma as never);

    expect(prisma.announcementReadReceipt.create).toHaveBeenCalledTimes(1);
    expect(prisma.announcementReadReceipt.create).toHaveBeenCalledWith({
      data: { announcementId: "ann-1", applicantUserId: "user-1", confirmedAt },
    });
  });

  it("既存の受信レシートは上書きしない（冪等・再実行しても重複・巻き戻しが発生しない・要件41.2）", async () => {
    const confirmedAt = new Date("2026-07-01T00:00:00.000Z");
    const prisma = fakePrisma(
      [{ announcementId: "ann-1", companyId: "company-1", confirmedAt }],
      {
        "company-1": [{ id: "user-1", companyId: "company-1", isActive: true }],
      },
      ["ann-1:user-1"]
    );

    const result = await backfillAnnouncementReadReceipts(prisma as never);

    expect(prisma.announcementReadReceipt.create).not.toHaveBeenCalled();
    expect(result.backfilledCount).toBe(0);
  });

  it("会社単位で確認済みの行が0件のときは何もしない", async () => {
    const prisma = fakePrisma([], {});

    const result = await backfillAnnouncementReadReceipts(prisma as never);

    expect(prisma.applicantUser.findMany).not.toHaveBeenCalled();
    expect(prisma.announcementReadReceipt.create).not.toHaveBeenCalled();
    expect(result.backfilledCount).toBe(0);
  });
});
