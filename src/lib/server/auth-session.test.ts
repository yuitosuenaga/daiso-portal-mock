import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/get-session", () => ({
  getSession: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { helpdeskStaff: { findUnique: vi.fn() } },
}));

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/server/get-session";
import {
  ForbiddenSessionError,
  UnauthorizedSessionError,
  isHelpdeskAdmin,
  requireHelpdeskAdminSession,
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

describe("requireHelpdeskAdminSession / isHelpdeskAdmin", () => {
  const staffSession = {
    claims: { id: "staff-1", role: "helpdesk", staffId: "staff-1", displayName: "田中" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adminスタッフのとき、クレームを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(staffSession as never);
    vi.mocked(prisma.helpdeskStaff.findUnique).mockResolvedValue({ role: "admin", isActive: true } as never);

    const result = await requireHelpdeskAdminSession();

    expect(result.claims.staffId).toBe("staff-1");
    expect(prisma.helpdeskStaff.findUnique).toHaveBeenCalledWith({
      where: { id: "staff-1" },
      select: { isActive: true, role: true },
    });
  });

  it("memberスタッフのとき、ForbiddenSessionErrorを送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(staffSession as never);
    vi.mocked(prisma.helpdeskStaff.findUnique).mockResolvedValue({ role: "member", isActive: true } as never);

    await expect(requireHelpdeskAdminSession()).rejects.toBeInstanceOf(ForbiddenSessionError);
  });

  it("無効化されたadminのとき、拒否する", async () => {
    vi.mocked(getSession).mockResolvedValue(staffSession as never);
    vi.mocked(prisma.helpdeskStaff.findUnique).mockResolvedValue({
      role: "admin",
      isActive: false,
    } as never);

    await expect(requireHelpdeskAdminSession()).rejects.toBeInstanceOf(ForbiddenSessionError);
    expect(await isHelpdeskAdmin()).toBe(false);
  });

  it("ForbiddenSessionErrorはUnauthorizedSessionErrorを継承する", () => {
    expect(new ForbiddenSessionError("x")).toBeInstanceOf(UnauthorizedSessionError);
  });

  it("スタッフ行が存在しないとき、拒否する", async () => {
    vi.mocked(getSession).mockResolvedValue(staffSession as never);
    vi.mocked(prisma.helpdeskStaff.findUnique).mockResolvedValue(null);

    await expect(requireHelpdeskAdminSession()).rejects.toBeInstanceOf(ForbiddenSessionError);
  });

  it("申請者セッションのとき、UnauthorizedSessionErrorを送出しDBを参照しない", async () => {
    vi.mocked(getSession).mockResolvedValue({
      claims: { id: "a-1", role: "applicant", applicantUserId: "a-1", companyId: "c" },
    } as never);

    await expect(requireHelpdeskAdminSession()).rejects.toBeInstanceOf(UnauthorizedSessionError);
    expect(prisma.helpdeskStaff.findUnique).not.toHaveBeenCalled();
  });

  it("未ログインのとき、UnauthorizedSessionErrorを送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(requireHelpdeskAdminSession()).rejects.toBeInstanceOf(UnauthorizedSessionError);
  });

  it("isHelpdeskAdmin: adminならtrue", async () => {
    vi.mocked(getSession).mockResolvedValue(staffSession as never);
    vi.mocked(prisma.helpdeskStaff.findUnique).mockResolvedValue({ role: "admin", isActive: true } as never);

    expect(await isHelpdeskAdmin()).toBe(true);
  });

  it("isHelpdeskAdmin: memberならfalse", async () => {
    vi.mocked(getSession).mockResolvedValue(staffSession as never);
    vi.mocked(prisma.helpdeskStaff.findUnique).mockResolvedValue({ role: "member", isActive: true } as never);

    expect(await isHelpdeskAdmin()).toBe(false);
  });

  it("isHelpdeskAdmin: スタッフ行が無ければfalse", async () => {
    vi.mocked(getSession).mockResolvedValue(staffSession as never);
    vi.mocked(prisma.helpdeskStaff.findUnique).mockResolvedValue(null);

    expect(await isHelpdeskAdmin()).toBe(false);
  });

  it("isHelpdeskAdmin: 未ログインならfalse", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    expect(await isHelpdeskAdmin()).toBe(false);
  });
});
