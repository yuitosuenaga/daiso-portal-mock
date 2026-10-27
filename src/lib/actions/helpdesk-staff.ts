"use server";

import { revalidatePath } from "next/cache";

import { requireHelpdeskAdminSession } from "@/lib/server/auth-session";
import {
  HelpdeskStaffNotFoundError,
  LastAdminError,
  StaffEmailTakenError,
  StaffSelfOperationError,
  createHelpdeskStaff,
  isStaffEmailTaken,
  setHelpdeskStaffActive,
  setHelpdeskStaffRole,
} from "@/lib/server/helpdesk-staff-service";
import { logger } from "@/lib/server/logger";
import { helpdeskStaffCreateFormSchema } from "@/lib/validation/helpdesk-staff";
import type {
  CreateHelpdeskStaffInput,
  HelpdeskStaffRole,
  HelpdeskStaffSummary,
} from "@/types/helpdesk-staff";

const HELPDESK_STAFF_PATH = "/[locale]/helpdesk/staff";

/**
 * スタッフ管理系Server Actionの戻り値。業務上の拒否は例外ではなく種別コードで返す
 * （本番ではServer Actionの例外メッセージがクライアントへ届く前にマスクされ、
 * メッセージ文字列による判定が成立しないため）。
 */
export type HelpdeskStaffActionResult =
  | { ok: true; staff: HelpdeskStaffSummary }
  | { ok: false; reason: "self" | "lastAdmin" | "notFound" | "emailTaken" };

function toFailure(error: unknown): HelpdeskStaffActionResult | null {
  if (error instanceof StaffSelfOperationError) return { ok: false, reason: "self" };
  if (error instanceof LastAdminError) return { ok: false, reason: "lastAdmin" };
  if (error instanceof HelpdeskStaffNotFoundError) return { ok: false, reason: "notFound" };
  if (error instanceof StaffEmailTakenError) return { ok: false, reason: "emailTaken" };
  return null;
}

/**
 * スタッフを新規作成し、一覧ルートを再検証する。権限確認は入力検証より先に行う。
 * メールアドレスの重複は`{ ok: false, reason: "emailTaken" }`で返す。
 */
export async function createHelpdeskStaffAction(
  input: CreateHelpdeskStaffInput
): Promise<HelpdeskStaffActionResult> {
  const session = await requireHelpdeskAdminSession();
  const parsed = helpdeskStaffCreateFormSchema.parse(input);

  if (await isStaffEmailTaken(parsed.email)) {
    return { ok: false, reason: "emailTaken" };
  }

  try {
    const staff = await createHelpdeskStaff(parsed);
    logger.info("helpdesk staff created", {
      operatorId: session.claims.staffId,
      staffId: staff.id,
      role: staff.role,
    });
    revalidatePath(HELPDESK_STAFF_PATH, "page");
    return { ok: true, staff };
  } catch (error) {
    const failure = toFailure(error);
    if (failure) return failure;
    throw error;
  }
}

/** スタッフのロールを変更する。自分自身・最後の有効adminの降格は`reason`で返す。 */
export async function setHelpdeskStaffRoleAction(
  staffId: string,
  role: HelpdeskStaffRole
): Promise<HelpdeskStaffActionResult> {
  const session = await requireHelpdeskAdminSession();

  try {
    const staff = await setHelpdeskStaffRole(staffId, role);
    logger.info("helpdesk staff role changed", {
      operatorId: session.claims.staffId,
      staffId,
      role,
    });
    revalidatePath(HELPDESK_STAFF_PATH, "page");
    return { ok: true, staff };
  } catch (error) {
    const failure = toFailure(error);
    if (failure) return failure;
    throw error;
  }
}

/** スタッフの有効状態を変更する。自分自身・最後の有効adminの無効化は`reason`で返す。 */
export async function setHelpdeskStaffActiveAction(
  staffId: string,
  isActive: boolean
): Promise<HelpdeskStaffActionResult> {
  const session = await requireHelpdeskAdminSession();

  try {
    const staff = await setHelpdeskStaffActive(staffId, isActive);
    logger.info("helpdesk staff active state changed", {
      operatorId: session.claims.staffId,
      staffId,
      isActive,
    });
    revalidatePath(HELPDESK_STAFF_PATH, "page");
    return { ok: true, staff };
  } catch (error) {
    const failure = toFailure(error);
    if (failure) return failure;
    throw error;
  }
}
