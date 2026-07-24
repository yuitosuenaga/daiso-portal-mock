import { describe, expect, it } from "vitest";

import { isAnnouncementDueDateOverdue } from "@/lib/announcement-overdue";

const NOW = new Date(2026, 6, 15); // 2026-07-15（ローカル時刻の当日0時）

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

  it("nowを省略した場合は現在時刻を基準に判定する", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, "0");
    const dd = String(yesterday.getDate()).padStart(2, "0");

    expect(isAnnouncementDueDateOverdue(`${yyyy}-${mm}-${dd}`)).toBe(true);
  });
});
