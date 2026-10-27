import "server-only";

import { getSession } from "@/lib/server/get-session";
import { getStaffAccess } from "@/lib/server/staff-access";
import type { ApplicantSessionClaims, HelpdeskSessionClaims } from "@/types/session";

export class UnauthorizedSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedSessionError";
  }
}

/** ログイン済みだが権限（ロール）が不足していることを表すエラー。 */
export class ForbiddenSessionError extends UnauthorizedSessionError {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenSessionError";
  }
}

/**
 * 申請者側の必須セッションを取得する。セッションが存在しない、またはロールが
 * `applicant`でない場合は例外を送出する。
 */
export async function requireApplicantSession(): Promise<{
  claims: ApplicantSessionClaims & { id: string };
}> {
  const session = await getSession();

  if (!session?.claims || session.claims.role !== "applicant") {
    throw new UnauthorizedSessionError("Applicant session required");
  }

  return { claims: session.claims };
}

/**
 * ヘルプデスク側の必須セッションを取得する。セッションが存在しない、または
 * ロールが`helpdesk`でない場合は例外を送出する。
 */
export async function requireHelpdeskStaffSession(): Promise<{
  claims: HelpdeskSessionClaims & { id: string };
}> {
  const session = await getSession();

  if (!session?.claims || session.claims.role !== "helpdesk") {
    throw new UnauthorizedSessionError("Helpdesk session required");
  }

  return { claims: session.claims };
}

/** staffIdが有効なadminかをDBで確認する（同一リクエスト内の重複照会は`getStaffAccess`でまとまる）。 */
async function isStaffAdmin(staffId: string): Promise<boolean> {
  const staff = await getStaffAccess(staffId);

  return staff?.role === "admin" && staff.isActive;
}

/**
 * ヘルプデスクのadminロールを必須とするセッションを取得する。ロールはJWTに載せず
 * 都度DBで確認する（ロール変更を即時に反映するため）。adminでなければ
 * `ForbiddenSessionError`を送出する。
 */
export async function requireHelpdeskAdminSession(): Promise<{
  claims: HelpdeskSessionClaims & { id: string };
}> {
  const session = await requireHelpdeskStaffSession();

  if (!(await isStaffAdmin(session.claims.staffId))) {
    throw new ForbiddenSessionError("Helpdesk admin role required");
  }

  return session;
}

/** 現在のセッションがヘルプデスクのadminか。未ログイン・申請者・スタッフ行なしはfalse。 */
export async function isHelpdeskAdmin(): Promise<boolean> {
  const session = await getSession();

  if (!session?.claims || session.claims.role !== "helpdesk") {
    return false;
  }

  return isStaffAdmin(session.claims.staffId);
}
