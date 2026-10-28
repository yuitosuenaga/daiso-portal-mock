import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { isAnnouncementDueDateOverdue } from "@/lib/announcement-overdue";

const NOW = new Date("2026-07-15T03:00:00.000Z"); // JST 2026-07-15 12:00

describe("isAnnouncementDueDateOverdue", () => {
  it("dueDateが昨日のときtrueを返す", () => {
    expect(isAnnouncementDueDateOverdue("2026-07-14", NOW)).toBe(true);
  });

  it("dueDateが今日（期限日当日）のときfalseを返す", () => {
    expect(isAnnouncementDueDateOverdue("2026-07-15", NOW)).toBe(false);
  });

  it("dueDateが明日のときfalseを返す", () => {
    expect(isAnnouncementDueDateOverdue("2026-07-16", NOW)).toBe(false);
  });

  it("dueDateがnullのときfalseを返す", () => {
    expect(isAnnouncementDueDateOverdue(null, NOW)).toBe(false);
  });

  it("dueDateがundefinedのときfalseを返す", () => {
    expect(isAnnouncementDueDateOverdue(undefined, NOW)).toBe(false);
  });

  describe("nowを省略した場合", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("現在時刻を基準に判定する", () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);

      expect(isAnnouncementDueDateOverdue("2026-07-14")).toBe(true);
      expect(isAnnouncementDueDateOverdue("2026-07-15")).toBe(false);
    });
  });
});

describe("isAnnouncementDueDateOverdue（JST固定・TZ非依存）", () => {
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "UTC";
  });
  afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("実行環境がUTCでも、JST 0:30（UTC前日15:30）は当日扱いで前日期限が超過になる", () => {
    const now = new Date("2026-07-14T15:30:00.000Z"); // JST 2026-07-15 00:30
    expect(isAnnouncementDueDateOverdue("2026-07-14", now)).toBe(true);
    expect(isAnnouncementDueDateOverdue("2026-07-15", now)).toBe(false);
  });

  it("JST 23:59（UTC 14:59）は期限日当日のため未超過", () => {
    const now = new Date("2026-07-15T14:59:00.000Z"); // JST 2026-07-15 23:59
    expect(isAnnouncementDueDateOverdue("2026-07-15", now)).toBe(false);
  });

  it("JST 日付が切り替わる境界（UTC 15:00）で超過に変わる", () => {
    expect(isAnnouncementDueDateOverdue("2026-07-15", new Date("2026-07-15T14:59:59.999Z"))).toBe(false);
    expect(isAnnouncementDueDateOverdue("2026-07-15", new Date("2026-07-15T15:00:00.000Z"))).toBe(true);
  });
});
