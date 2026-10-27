import "server-only";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  ForbiddenSessionError,
  requireHelpdeskAdminSession,
} from "@/lib/server/auth-session";
import type {
  CreateHelpdeskStaffInput,
  HelpdeskStaffRole,
  HelpdeskStaffSummary,
} from "@/types/helpdesk-staff";

/** パスワードハッシュ化のコスト係数。`applicant-user-service.ts`・`authorize.ts`と同一。 */
const PASSWORD_HASH_COST = 10;

/**
 * スタッフのロール変更・有効/無効切替を直列化するPostgreSQL advisory lockのキー（任意の固定値）。
 * 「有効なadminが0人にならない」検査と更新の間に別の更新が割り込むと、同時降格で
 * 全adminが失われるため、検査〜更新を同一トランザクション内でこのロックにより直列化する。
 * 他のadvisory lockキー（`announcement-escalation.ts`の`ESCALATION_ADVISORY_LOCK_KEY`
 * =7_203_803_001）と衝突しない値にすること。
 */
const STAFF_ADMIN_ADVISORY_LOCK_KEY = 7_203_803_002;

/** 自分自身のロール変更・無効化は許可しない。 */
export class StaffSelfOperationError extends Error {
  constructor() {
    super("Cannot change role or active state of yourself");
    this.name = "StaffSelfOperationError";
  }
}

/** 有効なadminが0人になる変更は許可しない。 */
export class LastAdminError extends Error {
  constructor() {
    super("At least one active admin is required");
    this.name = "LastAdminError";
  }
}

export class HelpdeskStaffNotFoundError extends Error {
  readonly staffId: string;

  constructor(staffId: string) {
    super("HelpdeskStaff not found");
    this.name = "HelpdeskStaffNotFoundError";
    this.staffId = staffId;
  }
}

/** メールアドレスが既存のスタッフ・申請者アカウントと重複することを表すエラー。 */
export class StaffEmailTakenError extends Error {
  constructor() {
    super("Email already taken");
    this.name = "StaffEmailTakenError";
  }
}

function mapStaff(record: {
  id: string;
  email: string;
  displayName: string;
  role: HelpdeskStaffRole;
  registrationSource: HelpdeskStaffSummary["registrationSource"];
  isActive: boolean;
  createdAt: Date;
}): HelpdeskStaffSummary {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    role: record.role,
    registrationSource: record.registrationSource,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
  };
}

/** スタッフ一覧を、有効なスタッフ→作成日の古い順で取得する。 */
export async function listHelpdeskStaff(): Promise<HelpdeskStaffSummary[]> {
  await requireHelpdeskAdminSession();

  const records = await prisma.helpdeskStaff.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });

  return records.map(mapStaff);
}

/**
 * メールアドレスが既存の`HelpdeskStaff`・`ApplicantUser`のいずれかと重複するかを
 * 大文字小文字を区別せずに確認する（Googleログインの照合が非区別のため）。
 */
export async function isStaffEmailTaken(email: string): Promise<boolean> {
  await requireHelpdeskAdminSession();

  const where = { email: { equals: email, mode: "insensitive" as const } };
  const [staff, applicant] = await Promise.all([
    prisma.helpdeskStaff.findFirst({ where }),
    prisma.applicantUser.findFirst({ where }),
  ]);

  return staff !== null || applicant !== null;
}

/**
 * スタッフを新規作成する。`password`が空・未指定なら`passwordHash=null`
 * （Googleログイン専用）、指定があればbcryptでハッシュ化して保存する。
 * 登録経路は`manual`、初期状態は有効。一意制約違反は`StaffEmailTakenError`。
 */
export async function createHelpdeskStaff(
  input: CreateHelpdeskStaffInput
): Promise<HelpdeskStaffSummary> {
  await requireHelpdeskAdminSession();

  const passwordHash = input.password
    ? await bcrypt.hash(input.password, PASSWORD_HASH_COST)
    : null;

  try {
    const record = await prisma.helpdeskStaff.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash,
        registrationSource: "manual",
        role: input.role,
        isActive: true,
      },
    });

    return mapStaff(record);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new StaffEmailTakenError();
    }
    throw error;
  }
}

type StaffChange = { role: HelpdeskStaffRole } | { isActive: boolean };

/**
 * ロール変更・有効/無効切替の共通処理。トランザクション内でadvisory lockにより直列化し、
 * 操作者の再検証・対象読込・自己操作の拒否・最後の有効admin保護を行ってから更新する。
 * 全クエリはtxで実行する。
 */
async function changeStaff(
  targetId: string,
  change: StaffChange
): Promise<HelpdeskStaffSummary> {
  const session = await requireHelpdeskAdminSession();
  const operatorId = session.claims.staffId;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${STAFF_ADMIN_ADVISORY_LOCK_KEY}::bigint)`;

    const operator = await tx.helpdeskStaff.findUnique({ where: { id: operatorId } });
    if (!operator || operator.role !== "admin" || !operator.isActive) {
      throw new ForbiddenSessionError("Helpdesk admin role required");
    }

    const target = await tx.helpdeskStaff.findUnique({ where: { id: targetId } });
    if (!target) {
      throw new HelpdeskStaffNotFoundError(targetId);
    }

    if (target.id === operator.id) {
      throw new StaffSelfOperationError();
    }

    const losesActiveAdmin =
      target.role === "admin" &&
      target.isActive &&
      (("role" in change && change.role !== "admin") ||
        ("isActive" in change && !change.isActive));

    if (losesActiveAdmin) {
      const otherActiveAdmins = await tx.helpdeskStaff.count({
        where: { role: "admin", isActive: true, id: { not: target.id } },
      });
      if (otherActiveAdmins === 0) {
        throw new LastAdminError();
      }
    }

    const record = await tx.helpdeskStaff.update({
      where: { id: target.id },
      data: change,
    });

    return mapStaff(record);
  });
}

/** スタッフのロールを変更する（自分自身・最後の有効adminの降格は拒否）。 */
export async function setHelpdeskStaffRole(
  staffId: string,
  role: HelpdeskStaffRole
): Promise<HelpdeskStaffSummary> {
  return changeStaff(staffId, { role });
}

/** スタッフの有効状態を変更する（自分自身・最後の有効adminの無効化は拒否）。 */
export async function setHelpdeskStaffActive(
  staffId: string,
  isActive: boolean
): Promise<HelpdeskStaffSummary> {
  return changeStaff(staffId, { isActive });
}
