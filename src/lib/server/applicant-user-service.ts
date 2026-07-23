import "server-only";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import type {
  ApplicantUserSummary,
  CreateApplicantUserInput,
  UpdateApplicantUserInput,
} from "@/types/applicant-user";

/** パスワードハッシュ化のコスト係数。`authorize.ts`・`prisma/seed.ts`と同一。 */
const PASSWORD_HASH_COST = 10;

export class ApplicantUserNotFoundError extends Error {
  constructor(applicantUserId: string) {
    super(`ApplicantUser not found: ${applicantUserId}`);
    this.name = "ApplicantUserNotFoundError";
  }
}

/**
 * メールアドレスが既存の`ApplicantUser`・`HelpdeskStaff`と重複しているために
 * 保存できないことを表すエラー。`"use server"`ファイル（`lib/actions/applicant-users.ts`）は
 * async関数以外をエクスポートできないため、このエラークラスはサービス層側に定義する。
 */
export class ApplicantUserEmailTakenError extends Error {
  constructor(email: string) {
    super(`Email already taken: ${email}`);
    this.name = "ApplicantUserEmailTakenError";
  }
}

function mapApplicantUser(record: {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  companyId: string;
  createdAt: Date;
  preferredLocale: string;
}): ApplicantUserSummary {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    isActive: record.isActive,
    companyId: record.companyId,
    createdAt: record.createdAt.toISOString(),
    preferredLocale: record.preferredLocale,
  };
}

/**
 * 指定された会社に所属する申請者アカウントを、有効なアカウントが先頭に
 * （`isActive`降順）、次に`displayName`昇順で取得する。
 */
export async function listApplicantUsersByCompany(
  companyId: string
): Promise<ApplicantUserSummary[]> {
  await requireHelpdeskStaffSession();

  const records = await prisma.applicantUser.findMany({
    where: { companyId },
    orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
  });

  return records.map(mapApplicantUser);
}

/** 指定されたIDの申請者アカウントを1件取得する。存在しない場合はnullを返す。 */
export async function getApplicantUserById(
  id: string
): Promise<ApplicantUserSummary | null> {
  await requireHelpdeskStaffSession();

  const record = await prisma.applicantUser.findUnique({ where: { id } });

  return record ? mapApplicantUser(record) : null;
}

/**
 * 申請者アカウントを新規作成する。入力された平文パスワードをハッシュ化してから
 * `passwordHash`として保存し、初期状態で`isActive: true`とする。
 */
export async function createApplicantUser(
  companyId: string,
  input: CreateApplicantUserInput
): Promise<ApplicantUserSummary> {
  await requireHelpdeskStaffSession();

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_COST);

  const record = await prisma.applicantUser.create({
    data: {
      email: input.email,
      displayName: input.displayName,
      passwordHash,
      companyId,
      isActive: true,
      preferredLocale: input.preferredLocale,
    },
  });

  return mapApplicantUser(record);
}

/**
 * 既存の申請者アカウントを更新する。`password`が指定されている場合のみハッシュ化して
 * `passwordHash`を更新し、未指定（`undefined`）の場合は既存のハッシュを変更しない。
 * 存在しない場合は`ApplicantUserNotFoundError`を送出する。
 */
export async function updateApplicantUser(
  id: string,
  input: UpdateApplicantUserInput
): Promise<ApplicantUserSummary> {
  await requireHelpdeskStaffSession();

  const passwordHash = input.password
    ? await bcrypt.hash(input.password, PASSWORD_HASH_COST)
    : undefined;

  try {
    const record = await prisma.applicantUser.update({
      where: { id },
      data: {
        email: input.email,
        displayName: input.displayName,
        preferredLocale: input.preferredLocale,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    return mapApplicantUser(record);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ApplicantUserNotFoundError(id);
    }
    throw error;
  }
}

/**
 * 申請者アカウントの有効状態のみを変更する。他のフィールド・関連する`Inquiry`・
 * `AnnouncementRecipientStatus`等のレコードには影響しない。
 * 存在しない場合は`ApplicantUserNotFoundError`を送出する。
 */
export async function setApplicantUserActive(
  id: string,
  isActive: boolean
): Promise<ApplicantUserSummary> {
  await requireHelpdeskStaffSession();

  try {
    const record = await prisma.applicantUser.update({
      where: { id },
      data: { isActive },
    });

    return mapApplicantUser(record);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ApplicantUserNotFoundError(id);
    }
    throw error;
  }
}

/**
 * 指定されたメールアドレスが既存の`ApplicantUser`・`HelpdeskStaff`のいずれかと
 * 重複するかを確認する。`excludeId`は`ApplicantUser`側のみに適用し（編集時に自分自身を
 * 除外するため）、`HelpdeskStaff`とのメールアドレス重複は常に重複として扱う。
 */
export async function isApplicantUserEmailTaken(
  email: string,
  excludeId?: string
): Promise<boolean> {
  await requireHelpdeskStaffSession();

  const [applicantUser, helpdeskStaff] = await Promise.all([
    prisma.applicantUser.findFirst({
      where: {
        email,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    }),
    prisma.helpdeskStaff.findFirst({ where: { email } }),
  ]);

  return applicantUser !== null || helpdeskStaff !== null;
}
