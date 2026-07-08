import "server-only";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db/prisma";
import type {
  ApplicantAuthorizedUser,
  HelpdeskAuthorizedUser,
} from "@/types/session";

/**
 * 申請者側企業ユーザーの認証情報を照合するモックAPI関数。
 * メールアドレスに対応する`ApplicantUser`が存在し、パスワードハッシュが一致する場合のみ
 * セッションクレームを返す。
 */
export async function authorizeApplicantCredentials(
  email: string,
  password: string
): Promise<ApplicantAuthorizedUser | null> {
  const applicantUser = await prisma.applicantUser.findUnique({
    where: { email },
    include: { company: true },
  });

  if (!applicantUser) {
    return null;
  }

  const isValid = await bcrypt.compare(password, applicantUser.passwordHash);
  if (!isValid) {
    return null;
  }

  return {
    id: applicantUser.id,
    role: "applicant",
    applicantUserId: applicantUser.id,
    companyId: applicantUser.companyId,
    companyName: applicantUser.company.name,
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
  const staff = await prisma.helpdeskStaff.findUnique({ where: { email } });

  if (!staff) {
    return null;
  }

  const isValid = await bcrypt.compare(password, staff.passwordHash);
  if (!isValid) {
    return null;
  }

  return {
    id: staff.id,
    role: "helpdesk",
    staffId: staff.id,
    displayName: staff.displayName,
  };
}
