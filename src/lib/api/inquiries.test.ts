import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/inquiry-service", () => ({
  createInquiryRecord: vi.fn(),
  listInquiriesForCompany: vi.fn(),
  listAllInquiries: vi.fn(),
  findInquiryById: vi.fn(),
  findInquiryForCompany: vi.fn(),
  setClaim: vi.fn(),
  updateStatus: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import {
  createInquiryRecord,
  findInquiryById as findInquiryByIdService,
  findInquiryForCompany,
  listAllInquiries as listAllInquiriesService,
  listInquiriesForCompany,
  setClaim,
  updateStatus,
} from "@/lib/server/inquiry-service";
import {
  createInquiry,
  getAllInquiries,
  getAllInquiryStatusSummary,
  getInquiries,
  getInquiryById,
  getInquiryStatusSummary,
  setInquiryClaim,
  updateInquiryStatus,
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

    expect(setClaim).toHaveBeenCalledWith("inquiry-1", {
      staffId: "staff-1",
      displayName: "田中 太郎",
    });
    expect(result.claim?.staffName).toBe("田中 太郎");
  });

  it("nullを渡すとclaimを解除する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(setClaim).mockResolvedValue(inquiry());

    await setInquiryClaim("inquiry-1", null);

    expect(setClaim).toHaveBeenCalledWith("inquiry-1", null);
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
