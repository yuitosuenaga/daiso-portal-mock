import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
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
 * `HelpdeskStaff`には現時点で`isActive`相当のフィールドが存在しないため、
 * ヘルプデスクセッションはこの再照会の対象外とする。
 */
export async function getSession(): Promise<Session | null> {
  const session = await auth();

  if (session?.claims?.role === "applicant") {
    const applicantUser = await prisma.applicantUser.findUnique({
      where: { id: session.claims.applicantUserId },
      select: { isActive: true },
    });

    if (!applicantUser?.isActive) {
      return { ...session, claims: null };
    }
  }

  return session;
}
