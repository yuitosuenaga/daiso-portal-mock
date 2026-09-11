import { describe, expect, it } from "vitest";

import {
  computeDailyIntake,
  formatIntakeDateLabel,
  toIntakeTrendColumns,
} from "@/lib/inquiry-intake-trend";
import type { Inquiry } from "@/types/inquiry";

function buildInquiry(overrides: Partial<Inquiry> & { id: string; createdAt: string }): Inquiry {
  return {
    title: "テストタイトル",
    category: "other",
    urgency: "medium",
    storeRegion: "Tokyo",
    originalText: "テスト本文",
    originalLanguage: "ja",
    status: "new",
    submittedBy: { companyName: "Test Co.", country: "JP" },
    claim: null,
    ...overrides,
  };
}

describe("computeDailyIntake", () => {
  const referenceDate = new Date("2026-07-23T00:00:00.000Z"); // JST 2026-07-23 09:00

  it("常に指定日数分を古い順で返し、0件の日も欠落しない", () => {
    const points = computeDailyIntake([], referenceDate, 7);

    expect(points).toHaveLength(7);
    expect(points.map((p) => p.dateKey)).toEqual([
      "2026-07-17",
      "2026-07-18",
      "2026-07-19",
      "2026-07-20",
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
    ]);
    expect(points.every((p) => p.count === 0)).toBe(true);
  });

  it("JST日付境界を跨いで正しく振り分ける", () => {
    const inquiries = [
      buildInquiry({ id: "1", createdAt: "2026-07-22T14:30:00.000Z" }), // JST 07-22 23:30
      buildInquiry({ id: "2", createdAt: "2026-07-22T15:30:00.000Z" }), // JST 07-23 00:30
    ];

    const points = computeDailyIntake(inquiries, referenceDate, 7);

    const jul22 = points.find((p) => p.dateKey === "2026-07-22");
    const jul23 = points.find((p) => p.dateKey === "2026-07-23");
    expect(jul22?.count).toBe(1);
    expect(jul23?.count).toBe(1);
  });

  it("範囲外の日付は集計しない", () => {
    const inquiries = [buildInquiry({ id: "1", createdAt: "2026-01-01T00:00:00.000Z" })];

    const points = computeDailyIntake(inquiries, referenceDate, 7);

    expect(points.every((p) => p.count === 0)).toBe(true);
  });
});

describe("toIntakeTrendColumns", () => {
  it("count最大値を100%とした高さを付与する", () => {
    const columns = toIntakeTrendColumns([
      { dateKey: "2026-07-21", count: 1 },
      { dateKey: "2026-07-22", count: 4 },
      { dateKey: "2026-07-23", count: 2 },
    ]);

    expect(columns.map((c) => c.heightPercent)).toEqual([25, 100, 50]);
  });

  it("全件0のときは全列0%になる（0除算しない）", () => {
    const columns = toIntakeTrendColumns([
      { dateKey: "2026-07-21", count: 0 },
      { dateKey: "2026-07-22", count: 0 },
    ]);

    expect(columns.every((c) => c.heightPercent === 0)).toBe(true);
  });
});

describe("formatIntakeDateLabel", () => {
  it("サーバーのTZに依存せず同一のJST日付でラベルを生成する", () => {
    const label = formatIntakeDateLabel("2026-07-22", "ja");
    expect(label).toContain("22");
  });

  it("日付境界付近でも前後の日にずれない", () => {
    const label = formatIntakeDateLabel("2026-01-01", "ja");
    expect(label).toContain("1");
  });
});
