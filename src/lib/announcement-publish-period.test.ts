import { describe, expect, it } from "vitest";

import { isWithinPublishPeriod } from "@/lib/announcement-publish-period";

const none = {
  publishStartDate: null,
  publishStartTime: null,
  publishEndDate: null,
  publishEndTime: null,
};

describe("isWithinPublishPeriod", () => {
  it("期間未設定なら常にtrue", () => {
    expect(isWithinPublishPeriod(none, new Date("2026-07-24T00:00:00Z"))).toBe(true);
  });

  it("開始日が未来ならfalse", () => {
    const a = { ...none, publishStartDate: "2026-07-25" };
    expect(isWithinPublishPeriod(a, new Date("2026-07-24T12:00:00+09:00"))).toBe(false);
  });

  it("開始時刻の既定はJST 09:00で、その境界から公開中", () => {
    const a = { ...none, publishStartDate: "2026-07-25" };
    expect(isWithinPublishPeriod(a, new Date("2026-07-25T08:59:59.999+09:00"))).toBe(false);
    expect(isWithinPublishPeriod(a, new Date("2026-07-25T09:00:00.000+09:00"))).toBe(true);
  });

  it("終了日が過去ならfalse", () => {
    const a = { ...none, publishEndDate: "2026-07-22" };
    expect(isWithinPublishPeriod(a, new Date("2026-07-24T00:00:00Z"))).toBe(false);
  });

  it("終了日の23:59:59.999(JST)までは公開中", () => {
    const a = { ...none, publishEndDate: "2026-07-22" };
    expect(isWithinPublishPeriod(a, new Date("2026-07-22T23:59:59.999+09:00"))).toBe(true);
    expect(isWithinPublishPeriod(a, new Date("2026-07-23T00:00:00.000+09:00"))).toBe(false);
  });
});
