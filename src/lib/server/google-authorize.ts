import "server-only";

import {
  checkGoogleProfile,
  decideGoogleLogin,
  normalizeEmail,
  type GoogleLoginErrorCode,
  type GoogleLoginPortal,
} from "@/lib/auth/google-login-policy";
import { prisma } from "@/lib/db/prisma";
import type {
  ApplicantAuthorizedUser,
  HelpdeskAuthorizedUser,
} from "@/types/session";

export type GoogleAuthorizeResult =
  | { ok: true; user: ApplicantAuthorizedUser | HelpdeskAuthorizedUser }
  | { ok: false; error: GoogleLoginErrorCode };

/**
 * Googleログイン後の最終認可（案A: 既存アカウントとのメール突き合わせのみ。自動作成しない）。
 * 許可ドメイン・email_verifiedの検査はDB照会より先に行い、許可外のメールではDBに触れない。
 * `portal`はユーザーがGoogleログインを開始した画面（申請者側/ヘルプデスク側）で、
 * 該当ポータルのアカウントのみを照会する（もう一方のポータルのアカウントへは遷移させない）。
 * メール比較は大文字小文字を無視する。
 */
export async function authorizeGoogleLogin(input: {
  email: string | null | undefined;
  emailVerified: boolean | null | undefined;
  portal: GoogleLoginPortal;
  allowedDomains: readonly string[];
}): Promise<GoogleAuthorizeResult> {
  const profileError = checkGoogleProfile(input);
  if (profileError) return { ok: false, error: profileError };
  const email = normalizeEmail(input.email as string);

  if (input.portal === "helpdesk") {
    const staff = await prisma.helpdeskStaff.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    // HelpdeskStaffには無効化の概念が無いため、存在すれば有効扱い
    const decision = decideGoogleLogin({ ...input, account: staff ? {} : null });
    if (!decision.ok) return { ok: false, error: decision.error };
    if (!staff) return { ok: false, error: "not_registered" };
    return {
      ok: true,
      user: {
        id: staff.id,
        role: "helpdesk",
        staffId: staff.id,
        displayName: staff.displayName,
      },
    };
  }

  const applicantUser = await prisma.applicantUser.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { company: true },
  });
  const decision = decideGoogleLogin({ ...input, account: applicantUser });
  if (!decision.ok) return { ok: false, error: decision.error };
  if (!applicantUser) return { ok: false, error: "not_registered" };
  return {
    ok: true,
    user: {
      id: applicantUser.id,
      role: "applicant",
      applicantUserId: applicantUser.id,
      companyId: applicantUser.companyId,
      companyName: applicantUser.company.name,
      companyCode: applicantUser.company.companyCode,
      country: applicantUser.company.country,
    },
  };
}
