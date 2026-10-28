import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DATE_FORMAT_OPTIONS,
  formatDate,
  formatDateOnly,
  formatDateTime,
} from "@/lib/format-date";

const TIME_ZONES = [
  "Asia/Tokyo",
  "UTC",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Pacific/Kiritimati",
];

describe.each(TIME_ZONES)("format-date（TZ=%s）", (tz) => {
  let originalTz: string | undefined;

  beforeEach(() => {
    originalTz = process.env.TZ;
    process.env.TZ = tz;
  });

  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("formatDateOnlyは暦日をそのまま整形する", () => {
    expect(formatDateOnly("2026-10-30", "ja")).toBe("2026年10月30日");
    expect(formatDateOnly("2026-10-30", "en")).toBe("Oct 30, 2026");
  });

  it("formatDateはJSTの暦日で整形する（JST 0:30）", () => {
    expect(formatDate("2026-10-29T15:30:00Z", "ja")).toBe("2026年10月30日");
    expect(formatDate("2026-10-29T15:30:00Z", "en")).toBe("Oct 30, 2026");
  });

  it("formatDateはJSTの暦日で整形する（JST 23:30）", () => {
    expect(formatDate("2026-10-30T14:30:00Z", "ja")).toBe("2026年10月30日");
    expect(formatDate("2026-10-30T14:30:00Z", "en")).toBe("Oct 30, 2026");
  });

  it("formatDateTimeの時刻はJSTの時:分", () => {
    expect(formatDateTime("2026-10-30T14:30:00Z", "ja")).toContain("23:30");
    expect(formatDateTime("2026-10-29T15:05:00Z", "en")).toBe("Oct 30, 2026, 12:05 AM");
    expect(formatDateTime("2026-10-29T15:05:00Z", "ja")).toContain("10月30日");
  });

  it("optionsにtimeZoneを渡しても上書きされない", () => {
    expect(
      formatDateTime("2026-10-30T14:30:00Z", "ja", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      })
    ).toBe("23:30");
  });

  it("不正な値は入力をそのまま返す", () => {
    expect(formatDateOnly("not-a-date", "ja")).toBe("not-a-date");
    expect(formatDate("not-a-date", "ja")).toBe("not-a-date");
    expect(formatDateTime("not-a-date", "ja")).toBe("not-a-date");
  });

  it("従来のtoLocaleDateString(JST環境)と表記が一致する", () => {
    const iso = "2026-03-05T03:00:00Z";
    for (const locale of ["ja", "en"]) {
      const expected = new Date(iso).toLocaleDateString(locale, {
        ...DATE_FORMAT_OPTIONS,
        timeZone: "Asia/Tokyo",
      });
      expect(formatDate(iso, locale)).toBe(expected);
    }
  });
});
