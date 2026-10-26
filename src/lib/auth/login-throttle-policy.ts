// ログイン試行制限（アカウントロックアウト）の判定（副作用なしの純関数）。DB・envには依存しない。

/** 連続失敗がこの回数に達したらロックする。 */
export const MAX_FAILED_ATTEMPTS = 5;
/** ロック時間（分）。 */
export const LOCKOUT_MINUTES = 15;
/** 最後の失敗からこの時間が経過したら失敗回数をリセットする（分）。 */
export const FAILURE_WINDOW_MINUTES = 15;

export interface ThrottleState {
  failedCount: number;
  lastFailedAt: Date | null;
  lockedUntil: Date | null;
}

export const EMPTY_THROTTLE_STATE: ThrottleState = {
  failedCount: 0,
  lastFailedAt: null,
  lockedUntil: null,
};

/** 現時点でロック中か。 */
export function isLocked(state: ThrottleState | null, now: Date): boolean {
  return !!state?.lockedUntil && state.lockedUntil.getTime() > now.getTime();
}

/**
 * 認証失敗を1回反映した次の状態を返す。ロック中の失敗はカウント・期限を変えない。
 * 失敗窓（FAILURE_WINDOW_MINUTES）を過ぎていれば1回目として数え直す。
 */
export function applyFailure(
  state: ThrottleState | null,
  now: Date
): { next: ThrottleState; becameLocked: boolean } {
  const current = state ?? EMPTY_THROTTLE_STATE;
  if (isLocked(current, now)) {
    return { next: current, becameLocked: false };
  }
  const windowExpired =
    !current.lastFailedAt ||
    now.getTime() - current.lastFailedAt.getTime() >
      FAILURE_WINDOW_MINUTES * 60_000 ||
    // ロック期限が過ぎた直後は数え直す
    current.lockedUntil !== null;
  const failedCount = (windowExpired ? 0 : current.failedCount) + 1;
  const becameLocked = failedCount >= MAX_FAILED_ATTEMPTS;
  return {
    next: {
      failedCount: becameLocked ? 0 : failedCount,
      lastFailedAt: now,
      lockedUntil: becameLocked
        ? new Date(now.getTime() + LOCKOUT_MINUTES * 60_000)
        : null,
    },
    becameLocked,
  };
}

/**
 * IPアドレスを匿名化した概要にする（IPv4は末尾オクテット、IPv6は下位80bitを落とす）。
 * 解釈できない値は"unknown"。
 */
export function summarizeIp(raw: string | null | undefined): string {
  if (!raw) return "unknown";
  const first = raw.split(",")[0].trim();
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/.exec(first);
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0/24`;
  if (first.includes(":") && /^[0-9a-fA-F:.]+$/.test(first)) {
    const mapped = /^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/i.exec(first);
    if (mapped) return `${mapped[1]}.${mapped[2]}.${mapped[3]}.0/24`;
    // "::"始まり（ループバック等）は上位グループが0なので全て落とす
    if (first.startsWith("::")) return "::/48";
    const head = first.split(":").slice(0, 3);
    if (head.some((g) => g === "")) return "unknown";
    return `${head.join(":").toLowerCase()}::/48`;
  }
  return "unknown";
}
