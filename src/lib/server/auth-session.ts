import "server-only";

import { getSession } from "@/lib/server/get-session";
import type { ApplicantSessionClaims, HelpdeskSessionClaims } from "@/types/session";

export class UnauthorizedSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedSessionError";
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
