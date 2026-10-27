import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    applicantUser: { findFirst: vi.fn() },
    helpdeskStaff: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { authorizeGoogleLogin } from "@/lib/server/google-authorize";

const base = {
  email: "Taro@Example.com",
  emailVerified: true,
  portal: "applicant" as const,
  allowedDomains: ["example.com"],
  hostedDomain: undefined as string | undefined,
  name: undefined as string | undefined,
  autoProvisionDomains: [] as string[],
};

const hd = {
  ...base,
  portal: "helpdesk" as const,
  hostedDomain: "example.com",
  name: "  田中 太郎 ",
  autoProvisionDomains: ["example.com"],
};
const staffRow = { id: "s1", email: "taro@example.com", displayName: "担当者" };
const staffUser = {
  id: "s1",
  role: "helpdesk",
  staffId: "s1",
  displayName: "担当者",
};
const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError("dup", {
    code: "P2002",
    clientVersion: "test",
  });

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
  vi.mocked(prisma.helpdeskStaff.create).mockReset();
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
      provisioned: false,
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
      provisioned: false,
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

  describe("ヘルプデスク自動作成", () => {
    it("OFF（autoProvisionDomains空）で未登録はnot_registered・createしない", async () => {
      vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue(null);
      expect(
        await authorizeGoogleLogin({ ...hd, autoProvisionDomains: [] })
      ).toEqual({ ok: false, error: "not_registered" });
      expect(prisma.helpdeskStaff.create).not.toHaveBeenCalled();
    });

    it("ON・未登録なら小文字メール・passwordHash null・google_autoで作成する", async () => {
      vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.applicantUser.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.helpdeskStaff.create).mockResolvedValue(staffRow as never);
      const result = await authorizeGoogleLogin(hd);
      expect(prisma.helpdeskStaff.create).toHaveBeenCalledWith({
        data: {
          email: "taro@example.com",
          displayName: "田中 太郎",
          passwordHash: null,
          registrationSource: "google_auto",
        },
      });
      expect(result).toEqual({ ok: true, user: staffUser, provisioned: true });
    });

    it("ON・既存ならcreateせずprovisioned:false", async () => {
      vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue(staffRow as never);
      expect(await authorizeGoogleLogin(hd)).toEqual({
        ok: true,
        user: staffUser,
        provisioned: false,
      });
      expect(prisma.helpdeskStaff.create).not.toHaveBeenCalled();
    });

    it("ONでも自動作成リスト外のドメインはnot_registered", async () => {
      vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue(null);
      expect(
        await authorizeGoogleLogin({ ...hd, autoProvisionDomains: ["other.com"] })
      ).toEqual({ ok: false, error: "not_registered" });
      expect(prisma.helpdeskStaff.create).not.toHaveBeenCalled();
    });

    it("hdが無い・不一致ならnot_registered", async () => {
      vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue(null);
      for (const h of [undefined, "other.com"]) {
        expect(await authorizeGoogleLogin({ ...hd, hostedDomain: h })).toEqual({
          ok: false,
          error: "not_registered",
        });
      }
      expect(prisma.helpdeskStaff.create).not.toHaveBeenCalled();
    });

    it("メール未確認はDB照会もcreateもせずemail_not_verified", async () => {
      expect(await authorizeGoogleLogin({ ...hd, emailVerified: false })).toEqual({
        ok: false,
        error: "email_not_verified",
      });
      expect(prisma.helpdeskStaff.findFirst).not.toHaveBeenCalled();
      expect(prisma.helpdeskStaff.create).not.toHaveBeenCalled();
    });

    it("許可外ドメインはdomain_not_allowed", async () => {
      expect(
        await authorizeGoogleLogin({ ...hd, email: "a@other.com", hostedDomain: "other.com" })
      ).toEqual({ ok: false, error: "domain_not_allowed" });
      expect(prisma.helpdeskStaff.create).not.toHaveBeenCalled();
    });

    it("ApplicantUserに同メールがあればnot_registered・createしない", async () => {
      vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.applicantUser.findFirst).mockResolvedValue(applicant as never);
      expect(await authorizeGoogleLogin(hd)).toEqual({
        ok: false,
        error: "not_registered",
      });
      expect(prisma.helpdeskStaff.create).not.toHaveBeenCalled();
    });

    it("P2002（競合）なら取り直した既存ユーザーでログイン（provisioned:false）", async () => {
      vi.mocked(prisma.helpdeskStaff.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(staffRow as never);
      vi.mocked(prisma.applicantUser.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.helpdeskStaff.create).mockRejectedValue(p2002());
      expect(await authorizeGoogleLogin(hd)).toEqual({
        ok: true,
        user: staffUser,
        provisioned: false,
      });
    });

    it("P2002後の取り直しがnullなら例外", async () => {
      vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.applicantUser.findFirst).mockResolvedValue(null);
      const err = p2002();
      vi.mocked(prisma.helpdeskStaff.create).mockRejectedValue(err);
      await expect(authorizeGoogleLogin(hd)).rejects.toBe(err);
    });

    it("P2002以外のエラーは再送出する", async () => {
      vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.applicantUser.findFirst).mockResolvedValue(null);
      const err = new Error("boom");
      vi.mocked(prisma.helpdeskStaff.create).mockRejectedValue(err);
      await expect(authorizeGoogleLogin(hd)).rejects.toBe(err);
    });

    it("申請者ポータルではONでも作成せず、未登録はnot_registered", async () => {
      vi.mocked(prisma.applicantUser.findFirst).mockResolvedValue(null);
      expect(
        await authorizeGoogleLogin({ ...hd, portal: "applicant" })
      ).toEqual({ ok: false, error: "not_registered" });
      expect(prisma.helpdeskStaff.create).not.toHaveBeenCalled();
    });
  });
});
