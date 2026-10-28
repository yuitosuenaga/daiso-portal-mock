import "server-only";

import bcrypt from "bcryptjs";

import { pickAccountByEmail } from "@/lib/auth/email-match";
import { prisma } from "@/lib/db/prisma";
import { hashIdentifier } from "@/lib/server/auth-audit";
import {
  findApplicantUserIdsByEmail,
  findHelpdeskStaffIdsByEmail,
} from "@/lib/server/email-lookup";
import { logger } from "@/lib/server/logger";
import type {
  ApplicantAuthorizedUser,
  HelpdeskAuthorizedUser,
} from "@/types/session";

/**
 * 存在しないメールでもbcryptを1回実行し、応答時間でアカウントの存否を判別されないようにする。
 * （有効なbcryptハッシュ。どのパスワードとも一致しない前提のダミー）
 */
const DUMMY_PASSWORD_HASH =
  "$2b$10$LD98kjvtmaUcczHiaCb1/O8cfIoFrQ2eTJhRpoz738qGe.H1AgwNm";

async function burnPasswordCheck(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
}

/**
 * 申請者側企業ユーザーの認証情報を照合するモックAPI関数。
 * メールアドレスに対応する`ApplicantUser`が存在し、パスワードハッシュが一致する場合のみ
 * セッションクレームを返す。
 */
export async function authorizeApplicantCredentials(
  email: string,
  password: string
): Promise<ApplicantAuthorizedUser | null> {
  // 大文字小文字を無視して候補を取り（保存値に大文字が残る既存データでもログインできる）、
  // 重複しているときは入力と完全一致する行だけを採用する。曖昧なら拒否する。
  // 照会は`lower(email) = $1`で行う（ILIKEだと`_`・`%`がワイルドカードになり別アカウントに一致する）
  const ids = await findApplicantUserIdsByEmail(email);
  const candidates =
    ids.length === 0
      ? []
      : await prisma.applicantUser.findMany({
          where: { id: { in: ids } },
          include: { company: true },
        });
  const picked = pickAccountByEmail(candidates, email);

  if (picked === null || picked === "ambiguous") {
    if (picked === "ambiguous") {
      logger.warn("login rejected: ambiguous email", {
        portal: "applicant",
        identifierHash: hashIdentifier(email),
      });
    }
    await burnPasswordCheck(password);
    return null;
  }
  const applicantUser = picked;

  const isValid = await bcrypt.compare(password, applicantUser.passwordHash);
  if (!isValid) {
    return null;
  }

  // 無効化された申請者アカウントのログインを拒否する（要件7.5）。パスワード誤りと
  // 同様にnullを返すことで、無効化されたアカウントか単なるパスワード誤りかを
  // 外部から判別されないようにする（意図的な設計判断）。
  if (!applicantUser.isActive) {
    return null;
  }

  return {
    id: applicantUser.id,
    role: "applicant",
    applicantUserId: applicantUser.id,
    companyId: applicantUser.companyId,
    companyName: applicantUser.company.name,
    companyCode: applicantUser.company.companyCode,
    country: applicantUser.company.country,
  };
}

/**
 * ヘルプデスク担当者の認証情報を照合する。
 * メールアドレスに対応する`HelpdeskStaff`が存在し、パスワードハッシュが一致する場合のみ
 * セッションクレームを返す。
 */
export async function authorizeHelpdeskCredentials(
  email: string,
  password: string
): Promise<HelpdeskAuthorizedUser | null> {
  const ids = await findHelpdeskStaffIdsByEmail(email);
  const candidates =
    ids.length === 0
      ? []
      : await prisma.helpdeskStaff.findMany({ where: { id: { in: ids } } });
  const picked = pickAccountByEmail(candidates, email);
  if (picked === "ambiguous") {
    logger.warn("login rejected: ambiguous email", {
      portal: "helpdesk",
      identifierHash: hashIdentifier(email),
    });
  }
  const staff = picked === "ambiguous" ? null : picked;

  // パスワード未設定（Google自動作成）の担当者も未登録と同扱い（応答時間で存否が分からないようにする）
  if (!staff || staff.passwordHash === null) {
    await burnPasswordCheck(password);
    return null;
  }

  const isValid = await bcrypt.compare(password, staff.passwordHash);
  if (!isValid) {
    return null;
  }

  // 無効化されたスタッフのログインを拒否する。申請者側と同様、パスワード誤りと
  // 区別できないようnullを返す。
  if (!staff.isActive) {
    return null;
  }

  return {
    id: staff.id,
    role: "helpdesk",
    staffId: staff.id,
    displayName: staff.displayName,
  };
}
