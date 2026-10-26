import "server-only";

import {
  applyFailure,
  FAILURE_WINDOW_MINUTES,
  isLocked,
  LOCKOUT_MINUTES,
  MAX_FAILED_ATTEMPTS,
  type ThrottleState,
} from "@/lib/auth/login-throttle-policy";
import { prisma } from "@/lib/db/prisma";
import {
  hashIdentifier,
  recordAuthEvent,
  type AuthPortal,
} from "@/lib/server/auth-audit";

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
    console.error(`login throttle ${op} failed`, errorKind(error));
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
 * 認証失敗を1文のSQLで原子的に反映する（`applyFailure`と同じ遷移をSQLで表現したもの）。
 * 行の読み取り→計算→書き込みを分けると並列試行で件数を取りこぼしロックをすり抜けるため、
 * `INSERT ... ON CONFLICT DO UPDATE`の行ロックで直列化する。
 * - ロック中の行は更新しない（WHERE句。行ロック待ち後の最新行で再評価される）
 * - 失敗窓超過・ロック期限切れ後は1回目として数え直す
 * - 閾値到達でfailedCountを0に戻しlockedUntilを設定する
 * @returns becameLocked: この失敗でロックが成立したか
 */
async function recordFailureAtomically(
  key: string,
  now: Date
): Promise<{ becameLocked: boolean }> {
  const first = applyFailure(null, now).next;
  const rows = await prisma.$queryRaw<{ lockedUntil: Date | null }[]>`
    INSERT INTO "LoginThrottle" ("key", "failedCount", "lastFailedAt", "lockedUntil", "updatedAt")
    VALUES (${key}, ${first.failedCount}, ${now}, ${first.lockedUntil}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "failedCount" = CASE
        WHEN (CASE
          WHEN "LoginThrottle"."lastFailedAt" IS NULL
            OR "LoginThrottle"."lockedUntil" IS NOT NULL
            OR "LoginThrottle"."lastFailedAt" < ${now}::timestamp - make_interval(mins => ${FAILURE_WINDOW_MINUTES}::int)
          THEN 1 ELSE "LoginThrottle"."failedCount" + 1 END) >= ${MAX_FAILED_ATTEMPTS}::int
        THEN 0
        WHEN "LoginThrottle"."lastFailedAt" IS NULL
          OR "LoginThrottle"."lockedUntil" IS NOT NULL
          OR "LoginThrottle"."lastFailedAt" < ${now}::timestamp - make_interval(mins => ${FAILURE_WINDOW_MINUTES}::int)
        THEN 1
        ELSE "LoginThrottle"."failedCount" + 1 END,
      "lastFailedAt" = ${now},
      "lockedUntil" = CASE
        WHEN (CASE
          WHEN "LoginThrottle"."lastFailedAt" IS NULL
            OR "LoginThrottle"."lockedUntil" IS NOT NULL
            OR "LoginThrottle"."lastFailedAt" < ${now}::timestamp - make_interval(mins => ${FAILURE_WINDOW_MINUTES}::int)
          THEN 1 ELSE "LoginThrottle"."failedCount" + 1 END) >= ${MAX_FAILED_ATTEMPTS}::int
        THEN ${now}::timestamp + make_interval(mins => ${LOCKOUT_MINUTES}::int)
        ELSE NULL END,
      "updatedAt" = ${now}
    WHERE "LoginThrottle"."lockedUntil" IS NULL OR "LoginThrottle"."lockedUntil" <= ${now}::timestamp
    RETURNING "lockedUntil"
  `;
  // 行が返らない = 既にロック中（更新なし）。返ったlockedUntilが非nullなら今回ロック成立。
  return { becameLocked: rows.length > 0 && rows[0].lockedUntil !== null };
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
 * - ロック中は認証処理自体を実行せずnullを返す（パスワードの正誤を探らせない）
 * - 失敗はカウントし、閾値到達でロック（login_locked）
 * - 成功時はカウンタをリセットし、login_successを記録
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
  const state = await withDbErrorLog("load", () => loadState(key));

  if (isLocked(state, now)) {
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
    if (state && (state.failedCount > 0 || state.lockedUntil)) {
      try {
        await prisma.loginThrottle.deleteMany({ where: { key } });
      } catch (error) {
        // 認証は成功している。カウンタ掃除の失敗でログインを失敗にしない
        console.error("login throttle reset failed", errorKind(error));
      }
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

  const { becameLocked } = await withDbErrorLog("record_failure", () =>
    recordFailureAtomically(key, now)
  );
  await recordAuthEvent({
    type: "login_failure",
    method: "credentials",
    portal,
    identifierHash,
    reason: "invalid_credentials",
  });
  if (becameLocked) {
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
