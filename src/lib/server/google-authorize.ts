import "server-only";

import { Prisma } from "@prisma/client";

import {
  canAutoProvisionHelpdesk,
  checkGoogleProfile,
  decideGoogleLogin,
  deriveStaffDisplayName,
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
  | {
      ok: true;
      user: ApplicantAuthorizedUser | HelpdeskAuthorizedUser;
      /** HelpdeskStaffを今回のログインで自動作成した場合のみtrue */
      provisioned: boolean;
    }
  | { ok: false; error: GoogleLoginErrorCode };

/**
 * Googleログイン後の最終認可。既存アカウントとのメール突き合わせが基本（案A: 未登録は
 * not_registeredで拒否）。例外として、ヘルプデスク側のみ`autoProvisionDomains`（環境変数で
 * 有効化したときだけ非空）に該当し、Googleのhd（Workspaceドメイン）がメールのドメインと一致する
 * 場合に限りHelpdeskStaffを自動作成する。申請者側（ApplicantUser）は自動作成しない。
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
  /** Googleプロフィールのhdクレーム（Workspaceドメイン） */
  hostedDomain?: string | null;
  /** Googleプロフィールのname（表示名の元） */
  name?: string | null;
  /** ヘルプデスク自動作成を許可するドメイン（空=自動作成しない） */
  autoProvisionDomains?: readonly string[];
}): Promise<GoogleAuthorizeResult> {
  const profileError = checkGoogleProfile(input);
  if (profileError) return { ok: false, error: profileError };
  const email = normalizeEmail(input.email as string);

  if (input.portal === "helpdesk") {
    let staff = await prisma.helpdeskStaff.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    let provisioned = false;
    if (!staff) {
      // 自動作成の対象外（フラグOFF・対象外ドメイン・hd不一致）は従来どおりnot_registered
      if (
        !canAutoProvisionHelpdesk({
          email,
          hostedDomain: input.hostedDomain,
          autoProvisionDomains: input.autoProvisionDomains ?? [],
        })
      ) {
        return { ok: false, error: "not_registered" };
      }
      // ApplicantUserとのメール重複は作成しない（isApplicantUserEmailTakenと同じ方針）
      const applicantWithEmail = await prisma.applicantUser.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (applicantWithEmail) return { ok: false, error: "not_registered" };
      try {
        staff = await prisma.helpdeskStaff.create({
          data: {
            email,
            displayName: deriveStaffDisplayName(input.name, email),
            passwordHash: null,
            registrationSource: "google_auto",
          },
        });
        provisioned = true;
      } catch (e) {
        // 同時ログインでの一意制約違反のみ、先に作成された行を取り直す
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) {
          throw e;
        }
        staff = await prisma.helpdeskStaff.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        if (!staff) throw e;
      }
    }
    return {
      ok: true,
      user: {
        id: staff.id,
        role: "helpdesk",
        staffId: staff.id,
        displayName: staff.displayName,
      },
      provisioned,
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
    provisioned: false,
  };
}
