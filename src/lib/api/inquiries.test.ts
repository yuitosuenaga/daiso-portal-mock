import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/inquiry-service", () => ({
  createInquiryRecord: vi.fn(),
  listInquiriesForCompany: vi.fn(),
  listAllInquiries: vi.fn(),
  findInquiryById: vi.fn(),
  findInquiryForCompany: vi.fn(),
  listUnreadReplyInquiryIds: vi.fn(),
  markInquiryRead: vi.fn(),
  setClaim: vi.fn(),
  updateStatus: vi.fn(),
  updateStatusIfCurrent: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import {
  createInquiryRecord,
  findInquiryById as findInquiryByIdService,
  findInquiryForCompany,
  listAllInquiries as listAllInquiriesService,
  listInquiriesForCompany,
  listUnreadReplyInquiryIds as listUnreadReplyInquiryIdsService,
  markInquiryRead as markInquiryReadService,
  setClaim,
  updateStatus,
  updateStatusIfCurrent,
} from "@/lib/server/inquiry-service";
import {
  createInquiry,
  getAllInquiries,
  getAllInquiryStatusSummary,
  getInquiries,
  getInquiryById,
  getInquiryStatusSummary,
  getUnreadReplyInquiryIds,
  markInquiryRead,
  setInquiryClaim,
  updateInquiryStatus,
  updateInquiryStatusIfCurrent,
} from "@/lib/api/inquiries";
import type { CreateInquiryInput, Inquiry } from "@/types/inquiry";

const applicantSession = {
  claims: {
    id: "applicant-1",
    role: "applicant" as const,
    applicantUserId: "applicant-1",
    companyId: "company-1",
    companyName: "Test Co.",
  },
};

const helpdeskSession = {
  claims: {
    id: "staff-1",
    role: "helpdesk" as const,
    staffId: "staff-1",
    displayName: "田中 太郎",
  },
};

function inquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: "inquiry-1",
    title: "商品破損についての問い合わせ",
    category: "defect",
    urgency: "high",
    storeRegion: "Kanto",
    originalText: "text",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-07-01T00:00:00.000Z",
    submittedBy: { companyName: "Test Co.", country: "JP" },
    claim: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createInquiry", () => {
  it("申請者セッションのcompanyIdを付与してInquiryServiceへ委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(createInquiryRecord).mockResolvedValue(inquiry());

    const input: CreateInquiryInput = {
      title: "追加発注についての問い合わせ",
      category: "order",
      urgency: "medium",
      storeRegion: "関東",
      originalText: "テスト",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-07-01T00:00:00.000Z",
      submittedBy: { companyName: "Test Company", country: "JP" },
    };

    const result = await createInquiry(input);

    expect(createInquiryRecord).toHaveBeenCalledWith({
      data: input,
      companyId: "company-1",
    });
    expect(result.id).toBe("inquiry-1");
  });

  it("未ログインのとき例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(
      createInquiry({} as CreateInquiryInput)
    ).rejects.toThrow();
  });

  it("ヘルプデスクセッション+対象会社IDのとき、指定会社IDを付与してInquiryServiceへ委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(createInquiryRecord).mockResolvedValue(inquiry());

    const input: CreateInquiryInput = {
      title: "電話で受けた問い合わせ",
      category: "order",
      urgency: "medium",
      storeRegion: "関東",
      originalText: "テスト",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-07-01T00:00:00.000Z",
      submittedBy: { companyName: "Test Company", country: "JP" },
    };

    const result = await createInquiry(input, "target-company-1");

    expect(createInquiryRecord).toHaveBeenCalledWith({
      data: input,
      companyId: "target-company-1",
    });
    expect(result.id).toBe("inquiry-1");
  });

  it("ヘルプデスクセッションでも対象会社IDが渡されないとき例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    await expect(
      createInquiry({} as CreateInquiryInput)
    ).rejects.toThrow();
    expect(createInquiryRecord).not.toHaveBeenCalled();
  });

  it("申請者セッションでも不正な入力（必須項目欠如）のときスキーマ検証で例外を送出しInquiryServiceへ委譲しない", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(
      createInquiry({ category: "invalid" } as unknown as CreateInquiryInput)
    ).rejects.toThrow();
    expect(createInquiryRecord).not.toHaveBeenCalled();
  });

  it("添付ファイル件数が上限を超える不正な入力のとき例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    const input: CreateInquiryInput = {
      title: "添付過多テスト",
      category: "order",
      urgency: "medium",
      storeRegion: "関東",
      originalText: "テスト",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-07-01T00:00:00.000Z",
      submittedBy: { companyName: "Test Company", country: "JP" },
      attachments: Array.from({ length: 100 }, (_, index) => ({
        id: `attachment-${index}`,
        fileName: `file-${index}.pdf`,
        fileType: "application/pdf" as const,
        fileSize: 1,
        dataUrl: "data:application/pdf;base64,AAAA",
      })),
    };

    await expect(createInquiry(input)).rejects.toThrow();
    expect(createInquiryRecord).not.toHaveBeenCalled();
  });
});

describe("getInquiries", () => {
  it("申請者セッションのcompanyIdでlistInquiriesForCompanyに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(listInquiriesForCompany).mockResolvedValue([inquiry()]);

    const result = await getInquiries();

    expect(listInquiriesForCompany).toHaveBeenCalledWith("company-1");
    expect(result).toHaveLength(1);
  });

  it("ヘルプデスクセッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    await expect(getInquiries()).rejects.toThrow();
  });
});

describe("getAllInquiries", () => {
  it("ヘルプデスクセッションでlistAllInquiriesに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(listAllInquiriesService).mockResolvedValue([inquiry()]);

    const result = await getAllInquiries();

    expect(listAllInquiriesService).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(getAllInquiries()).rejects.toThrow();
  });
});

describe("getInquiryById", () => {
  it("申請者セッションでは自社スコープでfindInquiryForCompanyに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findInquiryForCompany).mockResolvedValue(inquiry());

    const result = await getInquiryById("inquiry-1");

    expect(findInquiryForCompany).toHaveBeenCalledWith("inquiry-1", "company-1");
    expect(findInquiryByIdService).not.toHaveBeenCalled();
    expect(result?.id).toBe("inquiry-1");
  });

  it("ヘルプデスクセッションではfindInquiryByIdに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findInquiryByIdService).mockResolvedValue(inquiry());

    const result = await getInquiryById("inquiry-1");

    expect(findInquiryByIdService).toHaveBeenCalledWith("inquiry-1");
    expect(findInquiryForCompany).not.toHaveBeenCalled();
    expect(result?.id).toBe("inquiry-1");
  });

  it("セッションがない場合は例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(getInquiryById("inquiry-1")).rejects.toThrow();
  });

  it("存在しない場合nullを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findInquiryByIdService).mockResolvedValue(null);

    const result = await getInquiryById("missing");

    expect(result).toBeNull();
  });
});

describe("setInquiryClaim", () => {
  it("ヘルプデスクセッションの担当者情報でclaimを設定する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(setClaim).mockResolvedValue(
      inquiry({ claim: { staffName: "田中 太郎", claimedAt: "2026-07-01T00:00:00.000Z" } })
    );

    const result = await setInquiryClaim("inquiry-1", "Test Staff");

    expect(setClaim).toHaveBeenCalledWith(
      "inquiry-1",
      { staffId: "staff-1", displayName: "田中 太郎" },
      "staff-1"
    );
    expect(result.claim?.staffName).toBe("田中 太郎");
  });

  it("nullを渡すとclaimを解除する（actingStaffIdはセッションのstaffIdを渡す）", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(setClaim).mockResolvedValue(inquiry());

    await setInquiryClaim("inquiry-1", null);

    expect(setClaim).toHaveBeenCalledWith("inquiry-1", null, "staff-1");
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(setInquiryClaim("inquiry-1", "Test Staff")).rejects.toThrow();
  });
});

describe("updateInquiryStatus", () => {
  it("ヘルプデスクセッションでupdateStatusに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(updateStatus).mockResolvedValue(inquiry({ status: "resolved" }));

    const result = await updateInquiryStatus("inquiry-1", "resolved");

    expect(updateStatus).toHaveBeenCalledWith("inquiry-1", "resolved");
    expect(result.status).toBe("resolved");
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(updateInquiryStatus("inquiry-1", "resolved")).rejects.toThrow();
  });
});

describe("updateInquiryStatusIfCurrent", () => {
  it("ヘルプデスクセッションでupdateStatusIfCurrentに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(updateStatusIfCurrent).mockResolvedValue(true);

    const result = await updateInquiryStatusIfCurrent(
      "inquiry-1",
      "new",
      "in_progress"
    );

    expect(updateStatusIfCurrent).toHaveBeenCalledWith(
      "inquiry-1",
      "new",
      "in_progress"
    );
    expect(result).toBe(true);
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(
      updateInquiryStatusIfCurrent("inquiry-1", "new", "in_progress")
    ).rejects.toThrow();
  });
});

describe("getInquiryStatusSummary", () => {
  it("自社の問い合わせからステータス別件数を集計する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(listInquiriesForCompany).mockResolvedValue([
      inquiry({ status: "new" }),
      inquiry({ status: "resolved" }),
      inquiry({ status: "new" }),
    ]);

    const summary = await getInquiryStatusSummary();

    expect(summary).toEqual({ new: 2, in_progress: 0, resolved: 1 });
  });
});

describe("getUnreadReplyInquiryIds", () => {
  it("申請者セッションのcompanyIdでlistUnreadReplyInquiryIdsに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(listUnreadReplyInquiryIdsService).mockResolvedValue([
      "inquiry-1",
    ]);

    const result = await getUnreadReplyInquiryIds();

    expect(listUnreadReplyInquiryIdsService).toHaveBeenCalledWith(
      "company-1"
    );
    expect(result).toEqual(["inquiry-1"]);
  });

  it("ヘルプデスクセッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    await expect(getUnreadReplyInquiryIds()).rejects.toThrow();
  });
});

describe("markInquiryRead", () => {
  it("申請者セッションのcompanyIdでmarkInquiryReadに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(markInquiryReadService).mockResolvedValue(undefined);

    await markInquiryRead("inquiry-1");

    expect(markInquiryReadService).toHaveBeenCalledWith(
      "inquiry-1",
      "company-1"
    );
  });

  it("ヘルプデスクセッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    await expect(markInquiryRead("inquiry-1")).rejects.toThrow();
    expect(markInquiryReadService).not.toHaveBeenCalled();
  });
});

describe("getAllInquiryStatusSummary", () => {
  it("全社の問い合わせからステータス別件数を集計する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(listAllInquiriesService).mockResolvedValue([
      inquiry({ status: "in_progress" }),
      inquiry({ status: "resolved" }),
    ]);

    const summary = await getAllInquiryStatusSummary();

    expect(summary).toEqual({ new: 0, in_progress: 1, resolved: 1 });
  });
});
