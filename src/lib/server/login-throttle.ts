import "server-only";

import {
  applyFailure,
  isLocked,
  type ThrottleState,
} from "@/lib/auth/login-throttle-policy";
import { prisma } from "@/lib/db/prisma";
import {
  hashIdentifier,
  recordAuthEvent,
  type AuthPortal,
} from "@/lib/server/auth-audit";

function throttleKey(portal: AuthPortal, identifierHash: string): string {
  return `${portal}:${identifierHash}`;
}

async function loadState(key: string): Promise<ThrottleState | null> {
  return prisma.loginThrottle.findUnique({
    where: { key },
    select: { failedCount: true, lastFailedAt: true, lockedUntil: true },
  });
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
  const state = await loadState(key);

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
      await prisma.loginThrottle.deleteMany({ where: { key } });
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

  const { next, becameLocked } = applyFailure(state, now);
  await prisma.loginThrottle.upsert({
    where: { key },
    create: { key, ...next },
    update: next,
  });
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
