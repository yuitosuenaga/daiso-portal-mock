import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    inquiry: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    inquiryHistoryEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  appendHistoryEntry,
  createInquiryRecord,
  DoubleClaimError,
  findInquiryById,
  findInquiryForCompany,
  listAllInquiries,
  listHistory,
  listInquiriesForCompany,
  setClaim,
  updateStatus,
} from "@/lib/server/inquiry-service";

const baseInquiryRecord = {
  id: "inquiry-1",
  category: "defect",
  urgency: "high",
  storeRegion: "Kanto",
  originalText: "破損しています",
  originalLanguage: "ja",
  translatedText: null,
  status: "new",
  createdAt: new Date("2026-06-28T09:15:00.000Z"),
  companyId: "company-1",
  submittedByCompanyName: "Daiso Japan Trading Co.",
  submittedByCountry: "JP",
  claimedByStaffId: null,
  claimedByStaff: null,
  claimedAt: null,
  attachments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createInquiryRecord", () => {
  it("セッションのcompanyIdを永続化し、既存Inquiry型に整形した結果を返す", async () => {
    vi.mocked(prisma.inquiry.create).mockResolvedValue(baseInquiryRecord as never);

    const result = await createInquiryRecord({
      data: {
        category: "defect",
        urgency: "high",
        storeRegion: "Kanto",
        originalText: "破損しています",
        originalLanguage: "ja",
        status: "new",
        createdAt: "2026-06-28T09:15:00.000Z",
        submittedBy: { companyName: "Daiso Japan Trading Co.", country: "JP" },
      },
      companyId: "company-1",
    });

    expect(prisma.inquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId: "company-1" }),
      })
    );
    expect(result.id).toBe("inquiry-1");
    expect(result.submittedBy).toEqual({
      companyName: "Daiso Japan Trading Co.",
      country: "JP",
    });
    expect(result.claim).toBeNull();
  });
});

describe("listInquiriesForCompany", () => {
  it("指定したcompanyIdでのみ絞り込む", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([baseInquiryRecord] as never);

    const result = await listInquiriesForCompany("company-1");

    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: "company-1" } })
    );
    expect(result).toHaveLength(1);
  });
});

describe("listAllInquiries", () => {
  it("会社による絞り込みを行わず全件取得する", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([baseInquiryRecord] as never);

    await listAllInquiries();

    const callArgs = vi.mocked(prisma.inquiry.findMany).mock.calls[0]?.[0];
    expect(callArgs?.where).toBeUndefined();
  });
});

describe("findInquiryById", () => {
  it("該当データがない場合、nullを返す", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue(null);

    const result = await findInquiryById("missing");

    expect(result).toBeNull();
  });
});

describe("findInquiryForCompany", () => {
  it("該当companyIdの問い合わせが見つかれば返す", async () => {
    vi.mocked(prisma.inquiry.findFirst).mockResolvedValue(baseInquiryRecord as never);

    const result = await findInquiryForCompany("inquiry-1", "company-1");

    expect(prisma.inquiry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "inquiry-1", companyId: "company-1" } })
    );
    expect(result?.id).toBe("inquiry-1");
  });

  it("他社のcompanyIdでは見つからずnullを返す", async () => {
    vi.mocked(prisma.inquiry.findFirst).mockResolvedValue(null);

    const result = await findInquiryForCompany("inquiry-1", "other-company");

    expect(result).toBeNull();
  });
});

describe("setClaim", () => {
  it("未claimの問い合わせにclaimを設定する", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue(baseInquiryRecord as never);
    vi.mocked(prisma.inquiry.update).mockResolvedValue({
      ...baseInquiryRecord,
      claimedByStaffId: "staff-1",
      claimedByStaff: { displayName: "田中 太郎" },
      claimedAt: new Date("2026-07-01T00:00:00.000Z"),
    } as never);

    const result = await setClaim("inquiry-1", {
      staffId: "staff-1",
      displayName: "田中 太郎",
    });

    expect(result.claim).toEqual({
      staffName: "田中 太郎",
      claimedAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("既にclaim済みの問い合わせへの再claimはDoubleClaimErrorを送出する", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue({
      ...baseInquiryRecord,
      claimedByStaffId: "staff-1",
      claimedAt: new Date("2026-07-01T00:00:00.000Z"),
    } as never);

    await expect(
      setClaim("inquiry-1", { staffId: "staff-2", displayName: "鈴木 花子" })
    ).rejects.toThrow(DoubleClaimError);
    expect(prisma.inquiry.update).not.toHaveBeenCalled();
  });

  it("staffにnullを渡すとclaimを解除する", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue({
      ...baseInquiryRecord,
      claimedByStaffId: "staff-1",
      claimedAt: new Date("2026-07-01T00:00:00.000Z"),
    } as never);
    vi.mocked(prisma.inquiry.update).mockResolvedValue(baseInquiryRecord as never);

    const result = await setClaim("inquiry-1", null);

    expect(prisma.inquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { claimedByStaffId: null, claimedAt: null },
      })
    );
    expect(result.claim).toBeNull();
  });
});

describe("updateStatus", () => {
  it("ステータスを更新する", async () => {
    vi.mocked(prisma.inquiry.update).mockResolvedValue({
      ...baseInquiryRecord,
      status: "resolved",
    } as never);

    const result = await updateStatus("inquiry-1", "resolved");

    expect(result.status).toBe("resolved");
  });
});

describe("appendHistoryEntry", () => {
  it("対応履歴を追記し、既存InquiryHistoryEntry型に整形した結果を返す", async () => {
    vi.mocked(prisma.inquiryHistoryEntry.create).mockResolvedValue({
      id: "history-1",
      inquiryId: "inquiry-1",
      type: "claimed",
      actorName: "田中 太郎",
      occurredAt: new Date("2026-07-01T00:00:00.000Z"),
      detail: null,
      attachments: [],
    } as never);

    const result = await appendHistoryEntry({
      inquiryId: "inquiry-1",
      type: "claimed",
      actorName: "田中 太郎",
      occurredAt: "2026-07-01T00:00:00.000Z",
    });

    expect(result.id).toBe("history-1");
    expect(result.type).toBe("claimed");
  });
});

describe("listHistory", () => {
  it("発生時刻の降順で対応履歴を取得する", async () => {
    vi.mocked(prisma.inquiryHistoryEntry.findMany).mockResolvedValue([]);

    await listHistory("inquiry-1");

    expect(prisma.inquiryHistoryEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { inquiryId: "inquiry-1" } })
    );
  });
});
