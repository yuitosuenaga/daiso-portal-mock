import "server-only";

import { auth } from "@/auth";
import { getApplicantAccess } from "@/lib/server/applicant-access";
import { getStaffAccess } from "@/lib/server/staff-access";
import type { Session } from "next-auth";

/**
 * `auth()`はミドルウェア呼び出し等の複数のオーバーロードを持つため、
 * Route Handler・Server Action・テストコードから扱いやすい単一の戻り値型に固定する。
 *
 * JWTセッション戦略ではトークン発行後にDBの`ApplicantUser.isActive`が変更されても
 * （例: ヘルプデスク担当者による無効化）、トークン自体は有効期限まで内容が透過され
 * 続けてしまう。そのため申請者セッションについては、セッション参照の都度
 * `isActive`をDBへ再照会し、無効化されていれば`claims`を`null`として扱うことで
 * 以後のアクセスを遮断する（セキュリティ上のセッション即時失効対応）。
 * あわせて申請者の会社情報（`companyId`/`companyName`/`companyCode`/`country`）は、
 * JWTではなくDBの現在値が正とする。JWTの値はログイン時に固定され、管理者が販社の
 * companyCode・country・名称を変更しても古いまま残るため、参照の都度DB値で上書きして返す
 * （旧コードが別会社へ再割り当てされた場合の他社状態の読み書き等を防ぐ）。
 * ヘルプデスクセッションも同様に`HelpdeskStaff.isActive`を再照会し、無効化済み・
 * 削除済み（行なし）のスタッフは`claims`を`null`として扱う。
 */
export async function getSession(): Promise<Session | null> {
  const session = await auth();

  if (session?.claims?.role === "applicant") {
    const access = await getApplicantAccess(session.claims.applicantUserId);

    if (!access?.isActive) {
      return { ...session, claims: null };
    }

    return {
      ...session,
      claims: {
        ...session.claims,
        companyId: access.companyId,
        companyName: access.company.name,
        companyCode: access.company.companyCode,
        country: access.company.country,
      },
    };
  }

  if (session?.claims?.role === "helpdesk") {
    const staff = await getStaffAccess(session.claims.staffId);

    if (!staff?.isActive) {
      return { ...session, claims: null };
    }
  }

  return session;
}
