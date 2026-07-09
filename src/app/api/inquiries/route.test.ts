import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/get-session", () => ({
  getSession: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/inquiry-service", () => ({
  createInquiryRecord: vi.fn(),
  listInquiriesForCompany: vi.fn(),
  listAllInquiries: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import {
  createInquiryRecord,
  listAllInquiries,
  listInquiriesForCompany,
} from "@/lib/server/inquiry-service";
import { GET, POST } from "@/app/api/inquiries/route";

const applicantSession = {
  claims: {
    id: "applicant-1",
    role: "applicant" as const,
    applicantUserId: "applicant-1",
    companyId: "company-1",
    companyName: "Test Co.",
    companyCode: "test-co",
    country: "JP",
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

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/inquiries", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/inquiries", () => {
  it("未ログインのとき401を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await POST(jsonRequest({}));

    expect(response.status).toBe(401);
  });

  it("申請者セッションで有効な入力のとき、companyIdを付与して作成し201を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(createInquiryRecord).mockResolvedValue({ id: "inquiry-1" } as never);

    const response = await POST(
      jsonRequest({
        category: "defect",
        urgency: "high",
        storeRegion: "Kanto",
        originalText: "破損しています",
        originalLanguage: "ja",
        status: "new",
        createdAt: "2026-07-08T00:00:00.000Z",
        submittedBy: { companyName: "Test Co.", country: "JP" },
      })
    );

    expect(response.status).toBe(201);
    expect(createInquiryRecord).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: "company-1" })
    );
  });

  it("不正な入力のとき400を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    const response = await POST(jsonRequest({ category: "invalid" }));

    expect(response.status).toBe(400);
  });

  it("ヘルプデスクセッションでは403相当として作成できない", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    const response = await POST(jsonRequest({}));

    expect(response.status).toBe(401);
  });
});

describe("GET /api/inquiries", () => {
  it("申請者セッションのとき、自社分のみ取得する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(listInquiriesForCompany).mockResolvedValue([]);

    const response = await GET();

    expect(listInquiriesForCompany).toHaveBeenCalledWith("company-1");
    expect(response.status).toBe(200);
  });

  it("ヘルプデスクセッションのとき、全件取得する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(listAllInquiries).mockResolvedValue([]);

    const response = await GET();

    expect(listAllInquiries).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("未ログインのとき401を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });
});
