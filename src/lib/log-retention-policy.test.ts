import { describe, expect, it } from "vitest";

import {
  assertRetentionRule,
  MS_PER_DAY,
  RETENTION_RULES,
  retentionCutoff,
  type RetentionTarget,
} from "@/lib/log-retention-policy";

describe("RETENTION_RULES", () => {
  it.each(Object.keys(RETENTION_RULES) as RetentionTarget[])(
    "%s の保持日数は下限以上",
    (target) => {
      const rule = RETENTION_RULES[target];
      expect(rule.retentionDays).toBeGreaterThanOrEqual(rule.minRetentionDays);
      expect(() => assertRetentionRule(target, rule)).not.toThrow();
    }
  );

  it("計画どおりの保持日数・下限", () => {
    expect(RETENTION_RULES.authEvent).toEqual({ retentionDays: 365, minRetentionDays: 30 });
    expect(RETENTION_RULES.loginThrottle).toEqual({ retentionDays: 1, minRetentionDays: 1 });
    expect(RETENTION_RULES.announcementNotificationLog).toEqual({
      retentionDays: 180,
      minRetentionDays: 2,
    });
  });
});

describe("assertRetentionRule", () => {
  it("下限未満・非有限値は例外", () => {
    expect(() =>
      assertRetentionRule("authEvent", { retentionDays: 29, minRetentionDays: 30 })
    ).toThrow(/below the minimum/);
    expect(() =>
      assertRetentionRule("authEvent", { retentionDays: Number.NaN, minRetentionDays: 30 })
    ).toThrow();
  });
});

describe("retentionCutoff", () => {
  it("now から日数分さかのぼる", () => {
    const now = new Date("2026-10-29T00:00:00.000Z");
    expect(retentionCutoff(now, 365).getTime()).toBe(now.getTime() - 365 * MS_PER_DAY);
    expect(retentionCutoff(now, 1).toISOString()).toBe("2026-10-28T00:00:00.000Z");
  });
});
