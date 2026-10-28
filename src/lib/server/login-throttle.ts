import "server-only";

import {
  applyFailure,
  FAILURE_WINDOW_MINUTES,
  isLocked,
  LOCKOUT_MINUTES,
  MAX_FAILED_ATTEMPTS,
  type ThrottleState,
} from "@/lib/auth/login-throttle-policy";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  hashIdentifier,
  recordAuthEvent,
  type AuthPortal,
} from "@/lib/server/auth-audit";
import { logger } from "./logger";

/** ログ用にエラー種別のみ返す（メッセージにPIIが混じり得るため本文は出さない）。 */
function errorKind(error: unknown): string {
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    const name = (error as { name?: unknown }).name;
    return [typeof name === "string" ? name : "Error", typeof code === "string" ? code : null]
      .filter(Boolean)
      .join(":");
  }
  return "UnknownError";
}

/**
 * 試行制限台帳（テーブル不在・DB断など）で例外になった場合、原因が分かるようエラー種別のみ
 * ログに出して再送出する。握りつぶして認証を通す（fail open）ことはしない。
 */
async function withDbErrorLog<T>(op: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.error(`login throttle ${op} failed`, { op, errorKind: errorKind(error) });
    throw error;
  }
}

function throttleKey(portal: AuthPortal, identifierHash: string): string {
  return `${portal}:${identifierHash}`;
}

async function loadState(key: string): Promise<ThrottleState | null> {
  return prisma.loginThrottle.findUnique({
    where: { key },
    select: { failedCount: true, lastFailedAt: true, lockedUntil: true },
  });
}

/**
 * 照合の前に、試行の枠を1文のSQLで原子的に予約する（`applyFailure`と同じ遷移をSQLで表現したもの）。
 * 「ロック判定→照合→失敗記録」を分けると、同じメールへの並列試行が全てロック前の状態を読んで
 * 全件照合されてしまうため、照合の前に`INSERT ... ON CONFLICT DO UPDATE`の行ロックで直列化して数える。
 * - ロック中の行は更新しない（WHERE句。行ロック待ち後の最新行で再評価される）= 行が返らない = 照合させない
 * - 失敗窓超過・ロック期限切れ後は1回目として数え直す
 * - 閾値到達（5回目の予約）でfailedCountを0に戻しlockedUntilを設定する。以降の並列試行は照合されない
 * 窓の基準`lastFailedAt`は「最後の試行を予約した時刻」（照合時間の約100ms分、従来の失敗時刻より早い）。
 * 日時はISO文字列をtimestamptz経由でUTCのtimestampにして使う。Prismaは生クエリのDate引数を
 * timestamptzとして渡すため、`${now}::timestamp`ではセッションのTimeZoneにより+9h等ずれる。
 * @returns allowed: 照合に進んでよいか / locksOnFailure: この予約で閾値に達しロックが成立したか
 */
async function reserveAttempt(
  key: string,
  now: Date
): Promise<{ allowed: boolean; locksOnFailure: boolean }> {
  const first = applyFailure(null, now).next;
  const nowUtc = Prisma.sql`(${now.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
  const firstLockedUntil = first.lockedUntil
    ? Prisma.sql`(${first.lockedUntil.toISOString()}::timestamptz AT TIME ZONE 'UTC')`
    : Prisma.sql`NULL`;
  const rows = await prisma.$queryRaw<{ lockedUntil: Date | null }[]>`
    INSERT INTO "LoginThrottle" ("key", "failedCount", "lastFailedAt", "lockedUntil", "updatedAt")
    VALUES (${key}, ${first.failedCount}, ${nowUtc}, ${firstLockedUntil}, ${nowUtc})
    ON CONFLICT ("key") DO UPDATE SET
      "failedCount" = CASE
        WHEN (CASE
          WHEN "LoginThrottle"."lastFailedAt" IS NULL
            OR "LoginThrottle"."lockedUntil" IS NOT NULL
            OR "LoginThrottle"."lastFailedAt" < ${nowUtc} - make_interval(mins => ${FAILURE_WINDOW_MINUTES}::int)
          THEN 1 ELSE "LoginThrottle"."failedCount" + 1 END) >= ${MAX_FAILED_ATTEMPTS}::int
        THEN 0
        WHEN "LoginThrottle"."lastFailedAt" IS NULL
          OR "LoginThrottle"."lockedUntil" IS NOT NULL
          OR "LoginThrottle"."lastFailedAt" < ${nowUtc} - make_interval(mins => ${FAILURE_WINDOW_MINUTES}::int)
        THEN 1
        ELSE "LoginThrottle"."failedCount" + 1 END,
      "lastFailedAt" = ${nowUtc},
      "lockedUntil" = CASE
        WHEN (CASE
          WHEN "LoginThrottle"."lastFailedAt" IS NULL
            OR "LoginThrottle"."lockedUntil" IS NOT NULL
            OR "LoginThrottle"."lastFailedAt" < ${nowUtc} - make_interval(mins => ${FAILURE_WINDOW_MINUTES}::int)
          THEN 1 ELSE "LoginThrottle"."failedCount" + 1 END) >= ${MAX_FAILED_ATTEMPTS}::int
        THEN ${nowUtc} + make_interval(mins => ${LOCKOUT_MINUTES}::int)
        ELSE NULL END,
      "updatedAt" = ${nowUtc}
    WHERE "LoginThrottle"."lockedUntil" IS NULL OR "LoginThrottle"."lockedUntil" <= ${nowUtc}
    RETURNING "lockedUntil"
  `;
  // 行が返らない = 既にロック中（更新なし）。返ったlockedUntilが非nullなら今回の予約でロック成立。
  return { allowed: rows.length > 0, locksOnFailure: rows[0]?.lockedUntil != null };
}

/** 指定メールアドレスが現在ロック中か。 */
export async function isLoginLocked(
  portal: AuthPortal,
  email: string
): Promise<boolean> {
  const state = await loadState(throttleKey(portal, hashIdentifier(email)));
  return isLocked(state, new Date());
}

/**
 * パスワード認証付きのログイン処理を、試行制限と監査ログで包む。
 * - 照合の前に試行枠を原子的に予約する。ロック中（予約不可）は認証処理自体を実行せずnullを返す
 *   （パスワードの正誤を探らせない。並列に送っても照合は閾値回までしか実行されない）
 * - 予約した試行は失敗として数える（認証処理が例外になった場合も戻さない）。閾値到達でロック（login_locked）
 * - 成功時はカウンタ（5回目の予約でかかったロックを含む）を削除してリセットし、login_successを記録
 * - 予約のSQLが失敗したら認証処理を実行せず再送出する（fail closed）
 * ロックの有無・アカウントの存否に関わらず、呼び出し側へはnull/ユーザーのみ返す。
 */
export async function runProtectedCredentialsLogin<T extends { id: string }>(
  portal: AuthPortal,
  email: string,
  authorize: () => Promise<T | null>
): Promise<T | null> {
  const identifierHash = hashIdentifier(email);
  const key = throttleKey(portal, identifierHash);
  const now = new Date();
  const { allowed, locksOnFailure } = await withDbErrorLog("reserve", () =>
    reserveAttempt(key, now)
  );

  if (!allowed) {
    await recordAuthEvent({
      type: "login_blocked",
      method: "credentials",
      portal,
      identifierHash,
      reason: "account_locked",
    });
    return null;
  }

  const user = await authorize();

  if (user) {
    try {
      await prisma.loginThrottle.deleteMany({ where: { key } });
    } catch (error) {
      // 認証は成功している。カウンタ掃除の失敗でログインを失敗にしない
      logger.error("login throttle reset failed", { errorKind: errorKind(error) });
    }
    await recordAuthEvent({
      type: "login_success",
      method: "credentials",
      portal,
      userId: user.id,
      identifierHash,
    });
    return user;
  }

  await recordAuthEvent({
    type: "login_failure",
    method: "credentials",
    portal,
    identifierHash,
    reason: "invalid_credentials",
  });
  if (locksOnFailure) {
    await recordAuthEvent({
      type: "login_locked",
      method: "credentials",
      portal,
      identifierHash,
      reason: "too_many_failures",
    });
  }
  return null;
}
