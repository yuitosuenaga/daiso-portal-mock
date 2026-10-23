import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    applicantUser: { findFirst: vi.fn() },
    helpdeskStaff: { findFirst: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { authorizeGoogleLogin } from "@/lib/server/google-authorize";

const base = {
  email: "Taro@Example.com",
  emailVerified: true,
  portal: "applicant" as const,
  allowedDomains: ["example.com"],
};

const applicant = {
  id: "a1",
  email: "taro@example.com",
  isActive: true,
  companyId: "c1",
  company: { id: "c1", name: "Test Co.", country: "JP", companyCode: "jp-test" },
};

beforeEach(() => {
  vi.mocked(prisma.applicantUser.findFirst).mockReset();
  vi.mocked(prisma.helpdeskStaff.findFirst).mockReset();
});

describe("authorizeGoogleLogin", () => {
  it("登録済み・有効な申請者は、大文字小文字を無視して照会しクレームを返す", async () => {
    vi.mocked(prisma.applicantUser.findFirst).mockResolvedValue(applicant as never);
    const result = await authorizeGoogleLogin(base);
    expect(result).toEqual({
      ok: true,
      user: {
        id: "a1",
        role: "applicant",
        applicantUserId: "a1",
        companyId: "c1",
        companyName: "Test Co.",
        companyCode: "jp-test",
        country: "JP",
      },
    });
    expect(prisma.applicantUser.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: { equals: "taro@example.com", mode: "insensitive" } },
      })
    );
  });

  it("未登録メールは拒否する（自動作成しない）", async () => {
    vi.mocked(prisma.applicantUser.findFirst).mockResolvedValue(null);
    expect(await authorizeGoogleLogin(base)).toEqual({
      ok: false,
      error: "not_registered",
    });
  });

  it("無効化済みユーザーは拒否する", async () => {
    vi.mocked(prisma.applicantUser.findFirst).mockResolvedValue({
      ...applicant,
      isActive: false,
    } as never);
    expect(await authorizeGoogleLogin(base)).toEqual({
      ok: false,
      error: "account_inactive",
    });
  });

  it("許可外ドメイン・email未確認・許可ドメイン未設定ではDBを照会せず拒否する", async () => {
    expect(
      await authorizeGoogleLogin({ ...base, email: "a@sub.example.com" })
    ).toEqual({ ok: false, error: "domain_not_allowed" });
    expect(await authorizeGoogleLogin({ ...base, emailVerified: false })).toEqual({
      ok: false,
      error: "email_not_verified",
    });
    expect(await authorizeGoogleLogin({ ...base, allowedDomains: [] })).toEqual({
      ok: false,
      error: "domain_not_allowed",
    });
    expect(prisma.applicantUser.findFirst).not.toHaveBeenCalled();
  });

  it("ヘルプデスク画面からの開始ではHelpdeskStaffのみ照会する", async () => {
    vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue({
      id: "s1",
      email: "taro@example.com",
      displayName: "担当者",
    } as never);
    const result = await authorizeGoogleLogin({ ...base, portal: "helpdesk" });
    expect(result).toEqual({
      ok: true,
      user: { id: "s1", role: "helpdesk", staffId: "s1", displayName: "担当者" },
    });
    expect(prisma.applicantUser.findFirst).not.toHaveBeenCalled();
  });

  it("ヘルプデスク画面で未登録なら拒否する（申請者アカウントへはフォールバックしない）", async () => {
    vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue(null);
    expect(await authorizeGoogleLogin({ ...base, portal: "helpdesk" })).toEqual({
      ok: false,
      error: "not_registered",
    });
    expect(prisma.applicantUser.findFirst).not.toHaveBeenCalled();
  });
});
