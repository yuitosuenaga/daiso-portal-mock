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
import { pickAccountByEmail } from "@/lib/auth/email-match";
import { prisma } from "@/lib/db/prisma";
import { hashIdentifier } from "@/lib/server/auth-audit";
import { logger } from "@/lib/server/logger";
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
 * 大文字小文字を無視して候補を最大2件取り、複数あるときは小文字化済みメールと完全一致する行を採用する。
 * 一致が無い（曖昧な）場合はnullを返してwarnログ（識別子ハッシュのみ）を残す。
 * 並びを固定するためcreatedAt昇順で取得する。
 */
const CANDIDATE_ORDER = { createdAt: "asc" } as const;

function pickOrWarn<T extends { email: string }>(
  rows: T[],
  email: string,
  portal: GoogleLoginPortal
): T | null | "ambiguous" {
  const picked = pickAccountByEmail(rows, email);
  if (picked === "ambiguous") {
    logger.warn("google login rejected: ambiguous email", {
      portal,
      identifierHash: hashIdentifier(email),
    });
  }
  return picked;
}

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
    const staffCandidates = await prisma.helpdeskStaff.findMany({
      where: { email: { equals: email, mode: "insensitive" } },
      orderBy: CANDIDATE_ORDER,
      take: 2,
    });
    // 曖昧（大文字小文字違いの重複で完全一致なし）は自動作成にも進まず拒否する
    const pickedStaff = pickOrWarn(staffCandidates, email, "helpdesk");
    if (pickedStaff === "ambiguous") return { ok: false, error: "not_registered" };
    let staff = pickedStaff;
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
        const retried = await prisma.helpdeskStaff.findMany({
          where: { email: { equals: email, mode: "insensitive" } },
          orderBy: CANDIDATE_ORDER,
          take: 2,
        });
        const pickedRetry = pickOrWarn(retried, email, "helpdesk");
        if (pickedRetry === null || pickedRetry === "ambiguous") throw e;
        staff = pickedRetry;
      }
    }
    // 無効化済みスタッフは再作成・再有効化せず拒否する
    if (!staff.isActive) return { ok: false, error: "account_inactive" };
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

  const applicantCandidates = await prisma.applicantUser.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { company: true },
    orderBy: CANDIDATE_ORDER,
    take: 2,
  });
  const pickedApplicant = pickOrWarn(applicantCandidates, email, "applicant");
  if (pickedApplicant === "ambiguous") return { ok: false, error: "not_registered" };
  const applicantUser = pickedApplicant;
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
