import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startOfReferenceDay, toReferenceDateKey, toReferenceYearMonth } from "@/lib/reference-date";

describe("startOfReferenceDay（TZ=UTCでもJST 0:00を返す）", () => {
  it("JST正午 → 同日JST 0:00（前日UTC 15:00）", () => {
    expect(startOfReferenceDay(new Date("2026-07-24T03:00:00.000Z")).toISOString()).toBe(
      "2026-07-23T15:00:00.000Z"
    );
  });

  it("UTC 14:59（JST 23:59）は同日、UTC 15:00（JST翌0:00）は翌日の開始", () => {
    expect(startOfReferenceDay(new Date("2026-07-24T14:59:59.999Z")).toISOString()).toBe(
      "2026-07-23T15:00:00.000Z"
    );
    expect(startOfReferenceDay(new Date("2026-07-24T15:00:00.000Z")).toISOString()).toBe(
      "2026-07-24T15:00:00.000Z"
    );
  });

  it("日付キーはJST基準", () => {
    expect(toReferenceDateKey(new Date("2026-07-24T15:00:00.000Z"))).toBe("2026-07-25");
  });
});

const TIME_ZONES = [
  "Asia/Tokyo",
  "UTC",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Pacific/Kiritimati",
];

describe.each(TIME_ZONES)("toReferenceYearMonth（TZ=%s）", (tz) => {
  let originalTz: string | undefined;

  beforeEach(() => {
    originalTz = process.env.TZ;
    process.env.TZ = tz;
  });

  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("UTC 2026-10-31T16:00ZはJSTの2026年11月", () => {
    expect(toReferenceYearMonth(new Date("2026-10-31T16:00:00Z"))).toEqual({
      year: 2026,
      month: 11,
    });
  });

  it("JST月末のままなら当月", () => {
    expect(toReferenceYearMonth(new Date("2026-10-31T14:59:00Z"))).toEqual({
      year: 2026,
      month: 10,
    });
  });

  it("年またぎ: UTC 2026-12-31T15:00ZはJSTの2027年1月", () => {
    expect(toReferenceYearMonth(new Date("2026-12-31T15:00:00Z"))).toEqual({
      year: 2027,
      month: 1,
    });
  });
});
