import { describe, expect, it } from "vitest";

import {
  elapsedHoursSince,
  isInquiryAgingFilterValue,
  matchesInquiryAging,
  resolveInquiryAgingBucket,
} from "@/lib/inquiry-aging";

const referenceDate = new Date("2026-07-23T00:00:00.000Z");

function createdAtHoursAgo(hours: number): string {
  return new Date(referenceDate.getTime() - hours * 3_600_000).toISOString();
}

describe("elapsedHoursSince", () => {
  it("受付時刻からの経過時間を時間単位で返す", () => {
    expect(elapsedHoursSince(createdAtHoursAgo(10), referenceDate)).toBeCloseTo(10);
  });

  it("未来日時（createdAt > referenceDate）は0にclampする", () => {
    const futureCreatedAt = new Date(referenceDate.getTime() + 3_600_000).toISOString();
    expect(elapsedHoursSince(futureCreatedAt, referenceDate)).toBe(0);
  });
});

describe("resolveInquiryAgingBucket", () => {
  it("23.9時間経過はlt24h", () => {
    expect(resolveInquiryAgingBucket(createdAtHoursAgo(23.9), referenceDate)).toBe("lt24h");
  });

  it("24時間ちょうどはh24to72（境界は上位側）", () => {
    expect(resolveInquiryAgingBucket(createdAtHoursAgo(24), referenceDate)).toBe("h24to72");
  });

  it("72時間ちょうどはd3to7", () => {
    expect(resolveInquiryAgingBucket(createdAtHoursAgo(72), referenceDate)).toBe("d3to7");
  });

  it("168時間ちょうどはgte7d", () => {
    expect(resolveInquiryAgingBucket(createdAtHoursAgo(168), referenceDate)).toBe("gte7d");
  });

  it("0時間経過はlt24h", () => {
    expect(resolveInquiryAgingBucket(createdAtHoursAgo(0), referenceDate)).toBe("lt24h");
  });
});

describe("matchesInquiryAging", () => {
  it("over24hは24時間以上すべてtrue", () => {
    expect(matchesInquiryAging(createdAtHoursAgo(24), referenceDate, "over24h")).toBe(true);
    expect(matchesInquiryAging(createdAtHoursAgo(100), referenceDate, "over24h")).toBe(true);
    expect(matchesInquiryAging(createdAtHoursAgo(23.9), referenceDate, "over24h")).toBe(false);
  });

  it("over72hは72時間でfalseにならない（72時間以上でtrue）", () => {
    expect(matchesInquiryAging(createdAtHoursAgo(72), referenceDate, "over72h")).toBe(true);
    expect(matchesInquiryAging(createdAtHoursAgo(71.9), referenceDate, "over72h")).toBe(false);
  });

  it("バケット名は完全一致で判定する", () => {
    expect(matchesInquiryAging(createdAtHoursAgo(10), referenceDate, "lt24h")).toBe(true);
    expect(matchesInquiryAging(createdAtHoursAgo(10), referenceDate, "h24to72")).toBe(false);
  });
});

describe("isInquiryAgingFilterValue", () => {
  it("バケット・プリセットいずれも真になる", () => {
    expect(isInquiryAgingFilterValue("lt24h")).toBe(true);
    expect(isInquiryAgingFilterValue("over72h")).toBe(true);
  });

  it("未知の値は偽になる", () => {
    expect(isInquiryAgingFilterValue("unknown")).toBe(false);
    expect(isInquiryAgingFilterValue("")).toBe(false);
  });
});
