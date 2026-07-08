import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/inquiry-service", () => ({
  findInquiryById: vi.fn(),
  findInquiryForCompany: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import { findInquiryById, findInquiryForCompany } from "@/lib/server/inquiry-service";
import { GET } from "@/app/api/inquiries/[id]/route";

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
  claims: { id: "staff-1", role: "helpdesk" as const, staffId: "staff-1", displayName: "田中" },
};

describe("GET /api/inquiries/[id]", () => {
  it("未ログインのとき401を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: { id: "inquiry-1" },
    });

    expect(response.status).toBe(401);
  });

  it("存在しないIDのとき404を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findInquiryById).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: { id: "missing" },
    });

    expect(response.status).toBe(404);
  });

  it("ヘルプデスクセッションは他社の問い合わせも取得できる", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findInquiryById).mockResolvedValue({
      id: "inquiry-1",
      submittedBy: { companyName: "Other Co.", country: "US" },
    } as never);

    const response = await GET(new Request("http://localhost"), {
      params: { id: "inquiry-1" },
    });

    expect(response.status).toBe(200);
  });

  it("申請者セッションで他社の問い合わせにアクセスすると404を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findInquiryForCompany).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: { id: "inquiry-1" },
    });

    expect(findInquiryForCompany).toHaveBeenCalledWith("inquiry-1", "company-1");
    expect(response.status).toBe(404);
  });

  it("申請者セッションで自社の問い合わせにアクセスすると200を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findInquiryForCompany).mockResolvedValue({ id: "inquiry-1" } as never);

    const response = await GET(new Request("http://localhost"), {
      params: { id: "inquiry-1" },
    });

    expect(response.status).toBe(200);
  });
});
