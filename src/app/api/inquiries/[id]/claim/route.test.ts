import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/inquiry-service", () => ({
  setClaim: vi.fn(),
  DoubleClaimError: class DoubleClaimError extends Error {},
  InquiryNotFoundError: class InquiryNotFoundError extends Error {},
  ClaimOwnershipError: class ClaimOwnershipError extends Error {},
}));

import { getSession } from "@/lib/server/get-session";
import { setClaim } from "@/lib/server/inquiry-service";
import { POST } from "@/app/api/inquiries/[id]/claim/route";

const helpdeskSession = {
  claims: { id: "staff-1", role: "helpdesk" as const, staffId: "staff-1", displayName: "田中 太郎" },
};
const applicantSession = {
  claims: {
    id: "applicant-1",
    role: "applicant" as const,
    applicantUserId: "applicant-1",
    companyId: "company-1",
    companyName: "Test Co.",
  },
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/inquiries/inquiry-1/claim", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/inquiries/[id]/claim", () => {
  it("申請者セッションでは401を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    const response = await POST(request({ claim: true }), { params: { id: "inquiry-1" } });

    expect(response.status).toBe(401);
  });

  it("claim:trueでヘルプデスクセッションの担当者情報を設定する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(setClaim).mockResolvedValue({ id: "inquiry-1" } as never);

    const response = await POST(request({ claim: true }), { params: { id: "inquiry-1" } });

    expect(setClaim).toHaveBeenCalledWith(
      "inquiry-1",
      { staffId: "staff-1", displayName: "田中 太郎" },
      "staff-1"
    );
    expect(response.status).toBe(200);
  });

  it("claim:falseでclaimを解除する（actingStaffIdにセッションのstaffIdを渡す）", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(setClaim).mockResolvedValue({ id: "inquiry-1" } as never);

    await POST(request({ claim: false }), { params: { id: "inquiry-1" } });

    expect(setClaim).toHaveBeenCalledWith("inquiry-1", null, "staff-1");
  });

  it("既にclaim済みのとき409を返す", async () => {
    const { DoubleClaimError } = await import("@/lib/server/inquiry-service");
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(setClaim).mockRejectedValue(new DoubleClaimError("inquiry-1"));

    const response = await POST(request({ claim: true }), { params: { id: "inquiry-1" } });

    expect(response.status).toBe(409);
  });

  it("所有者不一致（ClaimOwnershipError）のとき403を返す", async () => {
    const { ClaimOwnershipError } = await import("@/lib/server/inquiry-service");
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(setClaim).mockRejectedValue(new ClaimOwnershipError("inquiry-1"));

    const response = await POST(request({ claim: false }), { params: { id: "inquiry-1" } });

    expect(response.status).toBe(403);
  });
});
