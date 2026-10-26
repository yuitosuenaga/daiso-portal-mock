import { describe, expect, it } from "vitest";

import {
  applyFailure,
  EMPTY_THROTTLE_STATE,
  FAILURE_WINDOW_MINUTES,
  isLocked,
  LOCKOUT_MINUTES,
  MAX_FAILED_ATTEMPTS,
  summarizeIp,
  type ThrottleState,
} from "@/lib/auth/login-throttle-policy";

const t0 = new Date("2026-10-26T00:00:00Z");
const after = (minutes: number) => new Date(t0.getTime() + minutes * 60_000);

function failTimes(n: number): { state: ThrottleState; becameLocked: boolean } {
  let state: ThrottleState = EMPTY_THROTTLE_STATE;
  let becameLocked = false;
  for (let i = 0; i < n; i++) {
    const r = applyFailure(state, after(i * 0.1));
    state = r.next;
    becameLocked = r.becameLocked;
  }
  return { state, becameLocked };
}

describe("applyFailure / isLocked", () => {
  it("閾値未満ではロックしない", () => {
    const { state, becameLocked } = failTimes(MAX_FAILED_ATTEMPTS - 1);
    expect(becameLocked).toBe(false);
    expect(state.failedCount).toBe(MAX_FAILED_ATTEMPTS - 1);
    expect(isLocked(state, after(1))).toBe(false);
  });

  it("閾値に達するとLOCKOUT_MINUTES分ロックする", () => {
    const { state, becameLocked } = failTimes(MAX_FAILED_ATTEMPTS);
    expect(becameLocked).toBe(true);
    expect(isLocked(state, after(1))).toBe(true);
    expect(isLocked(state, after(LOCKOUT_MINUTES + 1))).toBe(false);
  });

  it("ロック中の失敗は期限を延長しない", () => {
    const { state } = failTimes(MAX_FAILED_ATTEMPTS);
    const r = applyFailure(state, after(2));
    expect(r.becameLocked).toBe(false);
    expect(r.next.lockedUntil).toEqual(state.lockedUntil);
  });

  it("ロック期限が過ぎたら失敗回数を数え直す", () => {
    const { state } = failTimes(MAX_FAILED_ATTEMPTS);
    const r = applyFailure(state, after(LOCKOUT_MINUTES + 5));
    expect(r.next.failedCount).toBe(1);
    expect(r.next.lockedUntil).toBeNull();
  });

  it("失敗窓を過ぎた失敗は1回目として数える", () => {
    const first = applyFailure(null, t0).next;
    const r = applyFailure(first, after(FAILURE_WINDOW_MINUTES + 1));
    expect(r.next.failedCount).toBe(1);
  });

  it("nullの状態でも扱える", () => {
    expect(isLocked(null, t0)).toBe(false);
  });
});

describe("summarizeIp", () => {
  it("IPv4は末尾オクテットを落とす", () => {
    expect(summarizeIp("203.0.113.45")).toBe("203.0.113.0/24");
  });
  it("x-forwarded-forは先頭のみ使う", () => {
    expect(summarizeIp("203.0.113.45, 10.0.0.1")).toBe("203.0.113.0/24");
  });
  it("IPv6は上位48bitのみ残す", () => {
    expect(summarizeIp("2001:db8:abcd:1234::1")).toBe("2001:db8:abcd::/48");
  });
  it("ループバック・IPv4射影アドレスを正しく扱う", () => {
    expect(summarizeIp("::1")).toBe("::/48");
    expect(summarizeIp("::ffff:203.0.113.45")).toBe("203.0.113.0/24");
  });
  it("不正・未指定はunknown", () => {
    expect(summarizeIp(null)).toBe("unknown");
    expect(summarizeIp("not-an-ip")).toBe("unknown");
  });
});
