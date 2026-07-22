import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    inquiry: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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
  listUnreadReplyInquiryIds,
  markInquiryRead,
  setClaim,
  updateStatus,
  updateStatusIfCurrent,
} from "@/lib/server/inquiry-service";

const baseInquiryRecord = {
  id: "inquiry-1",
  title: "商品破損についての問い合わせ",
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
        title: "商品破損についての問い合わせ",
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

  it("translatedTextを書き込まない（DB既定のnullのまま維持する）", async () => {
    vi.mocked(prisma.inquiry.create).mockResolvedValue(baseInquiryRecord as never);

    const result = await createInquiryRecord({
      data: {
        title: "追加発注のお願い",
        category: "order",
        urgency: "medium",
        storeRegion: "West Coast",
        originalText: "We would like to place an additional order.",
        originalLanguage: "en",
        status: "new",
        createdAt: "2026-06-28T09:15:00.000Z",
        submittedBy: { companyName: "Daiso USA Inc.", country: "US" },
      },
      companyId: "company-1",
    });

    const createArgs = vi.mocked(prisma.inquiry.create).mock.calls[0]?.[0];
    expect(createArgs?.data).not.toHaveProperty("translatedText");
    expect(result.translatedText).toBeUndefined();
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

describe("updateStatusIfCurrent", () => {
  it("条件に合致し更新できたときtrueを返す", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 1 });

    const result = await updateStatusIfCurrent(
      "inquiry-1",
      "new",
      "in_progress"
    );

    expect(prisma.inquiry.updateMany).toHaveBeenCalledWith({
      where: { id: "inquiry-1", status: "new" },
      data: { status: "in_progress" },
    });
    expect(result).toBe(true);
  });

  it("現在のstatusが期待値と異なり更新されなかったときfalseを返す", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 0 });

    const result = await updateStatusIfCurrent(
      "inquiry-1",
      "new",
      "in_progress"
    );

    expect(result).toBe(false);
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

describe("listUnreadReplyInquiryIds", () => {
  it("lastReadAtがnullでヘルプデスク起点履歴が存在する場合は未読と判定する", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([
      {
        id: "inquiry-1",
        lastReadAt: null,
        history: [{ occurredAt: new Date("2026-07-10T00:00:00.000Z") }],
      },
    ] as never);

    const result = await listUnreadReplyInquiryIds("company-1");

    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: "company-1" } })
    );
    expect(result).toEqual(["inquiry-1"]);
  });

  it("lastReadAtがnullでもヘルプデスク起点履歴が0件の場合は未読にならない（作成直後）", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([
      { id: "inquiry-1", lastReadAt: null, history: [] },
    ] as never);

    const result = await listUnreadReplyInquiryIds("company-1");

    expect(result).toEqual([]);
  });

  it("ヘルプデスク起点履歴の最新発生時刻がlastReadAtより新しい場合は未読と判定する", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([
      {
        id: "inquiry-1",
        lastReadAt: new Date("2026-07-01T00:00:00.000Z"),
        history: [{ occurredAt: new Date("2026-07-05T00:00:00.000Z") }],
      },
    ] as never);

    const result = await listUnreadReplyInquiryIds("company-1");

    expect(result).toEqual(["inquiry-1"]);
  });

  it("ヘルプデスク起点履歴の最新発生時刻がlastReadAt以前の場合は未読にならない", async () => {
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([
      {
        id: "inquiry-1",
        lastReadAt: new Date("2026-07-10T00:00:00.000Z"),
        history: [{ occurredAt: new Date("2026-07-05T00:00:00.000Z") }],
      },
    ] as never);

    const result = await listUnreadReplyInquiryIds("company-1");

    expect(result).toEqual([]);
  });

  it("申請者自身のrequester_messageのみの問い合わせは未読判定の対象履歴に含まれず未読にならない", async () => {
    // サービス層のクエリはhistoryをHELPDESK_ORIGIN_HISTORY_TYPESでフィルタして取得するため、
    // requester_messageのみの場合はhistoryが空配列として返る想定
    vi.mocked(prisma.inquiry.findMany).mockResolvedValue([
      { id: "inquiry-1", lastReadAt: null, history: [] },
    ] as never);

    const result = await listUnreadReplyInquiryIds("company-1");

    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: "company-1" },
        select: expect.objectContaining({
          history: expect.objectContaining({
            where: {
              type: {
                in: ["reply_sent", "status_changed", "claimed", "released"],
              },
            },
          }),
        }),
      })
    );
    expect(result).toEqual([]);
  });
});

describe("markInquiryRead", () => {
  it("自社スコープの問い合わせのlastReadAtのみを現在時刻に更新する", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 1 } as never);

    await markInquiryRead("inquiry-1", "company-1");

    expect(prisma.inquiry.updateMany).toHaveBeenCalledWith({
      where: { id: "inquiry-1", companyId: "company-1" },
      data: { lastReadAt: expect.any(Date) },
    });
  });

  it("他社スコープのIDでは対象0件となり更新されない", async () => {
    vi.mocked(prisma.inquiry.updateMany).mockResolvedValue({ count: 0 } as never);

    await markInquiryRead("inquiry-1", "other-company");

    expect(prisma.inquiry.updateMany).toHaveBeenCalledWith({
      where: { id: "inquiry-1", companyId: "other-company" },
      data: { lastReadAt: expect.any(Date) },
    });
  });
});
