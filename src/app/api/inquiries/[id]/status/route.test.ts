import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/inquiry-service", () => ({
  updateStatus: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import { updateStatus } from "@/lib/server/inquiry-service";
import { POST } from "@/app/api/inquiries/[id]/status/route";

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
  return new NextRequest("http://localhost/api/inquiries/inquiry-1/status", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/inquiries/[id]/status", () => {
  it("申請者セッションでは401を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    const response = await POST(request({ status: "resolved" }), {
      params: { id: "inquiry-1" },
    });

    expect(response.status).toBe(401);
  });

  it("不正なstatus値のとき400を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    const response = await POST(request({ status: "unknown" }), {
      params: { id: "inquiry-1" },
    });

    expect(response.status).toBe(400);
  });

  it("有効なstatus値のとき更新して200を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(updateStatus).mockResolvedValue({ id: "inquiry-1", status: "resolved" } as never);

    const response = await POST(request({ status: "resolved" }), {
      params: { id: "inquiry-1" },
    });

    expect(updateStatus).toHaveBeenCalledWith("inquiry-1", "resolved");
    expect(response.status).toBe(200);
  });
});
