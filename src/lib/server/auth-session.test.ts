import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/get-session", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import {
  requireApplicantSession,
  requireHelpdeskStaffSession,
} from "@/lib/server/auth-session";

describe("requireApplicantSession", () => {
  it("申請者セッションが存在するとき、クレームを返す", async () => {
    vi.mocked(getSession).mockResolvedValue({
      claims: {
        id: "applicant-1",
        role: "applicant",
        applicantUserId: "applicant-1",
        companyId: "company-1",
        companyName: "Test Co.",
      },
    } as never);

    const result = await requireApplicantSession();

    expect(result.claims.role).toBe("applicant");
    expect(result.claims.companyId).toBe("company-1");
  });

  it("セッションが存在しないとき、例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(requireApplicantSession()).rejects.toThrow();
  });

  it("ヘルプデスクセッションのとき、例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue({
      claims: { id: "staff-1", role: "helpdesk", staffId: "staff-1", displayName: "田中" },
    } as never);

    await expect(requireApplicantSession()).rejects.toThrow();
  });
});

describe("requireHelpdeskStaffSession", () => {
  it("ヘルプデスクセッションが存在するとき、クレームを返す", async () => {
    vi.mocked(getSession).mockResolvedValue({
      claims: { id: "staff-1", role: "helpdesk", staffId: "staff-1", displayName: "田中 太郎" },
    } as never);

    const result = await requireHelpdeskStaffSession();

    expect(result.claims.role).toBe("helpdesk");
    expect(result.claims.displayName).toBe("田中 太郎");
  });

  it("セッションが存在しないとき、例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(requireHelpdeskStaffSession()).rejects.toThrow();
  });

  it("申請者セッションのとき、例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue({
      claims: {
        id: "applicant-1",
        role: "applicant",
        applicantUserId: "applicant-1",
        companyId: "company-1",
        companyName: "Test Co.",
      },
    } as never);

    await expect(requireHelpdeskStaffSession()).rejects.toThrow();
  });
});
