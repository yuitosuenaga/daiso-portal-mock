import { describe, expect, it } from "vitest";

import { computeApplicantInquiryStats, toUrgencyRows } from "@/lib/inquiry-stats";
import type { Inquiry } from "@/types/inquiry";

function buildInquiry(overrides: Partial<Inquiry>): Inquiry {
  return {
    id: "inquiry-x",
    title: "テストタイトル",
    category: "other",
    urgency: "medium",
    storeRegion: "Tokyo",
    originalText: "テスト本文",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-06-01T00:00:00.000Z",
    submittedBy: { companyName: "Test Co.", country: "JP" },
    ...overrides,
  };
}

const referenceDate = new Date("2026-07-23T00:00:00.000Z");

describe("computeApplicantInquiryStats", () => {
  it("空配列を渡すと全項目0を返す", () => {
    const stats = computeApplicantInquiryStats([], {
      unreadInquiryIds: new Set(),
      referenceDate,
    });

    expect(stats).toEqual({
      total: 0,
      byStatus: { new: 0, in_progress: 0, resolved: 0 },
      unresolved: 0,
      unread: 0,
      awaitingResponse: 0,
      highUrgencyUnresolved: 0,
      byUrgencyUnresolved: { high: 0, medium: 0, low: 0 },
      byCategory: { defect: 0, order: 0, system: 0, other: 0 },
      unresolvedAging: { lt24h: 0, h24to72: 0, d3to7: 0, gte7d: 0 },
      oldestUnresolvedHours: null,
      staleAwaitingResponse: 0,
      dailyIntake: stats.dailyIntake,
      todayCount: 0,
    });
    expect(stats.dailyIntake).toHaveLength(7);
    expect(stats.dailyIntake.every((point) => point.count === 0)).toBe(true);
  });

  it("unreadはstatusを問わずunreadInquiryIdsに含まれる件数を数える", () => {
    const inquiries = [
      buildInquiry({ id: "1", status: "new" }),
      buildInquiry({ id: "2", status: "resolved" }),
      buildInquiry({ id: "3", status: "in_progress" }),
    ];

    const stats = computeApplicantInquiryStats(inquiries, {
      unreadInquiryIds: new Set(["1", "2"]),
    });

    expect(stats.unread).toBe(2);
  });

  it("awaitingResponseはstatus=newの件数と一致する", () => {
    const inquiries = [
      buildInquiry({ id: "1", status: "new" }),
      buildInquiry({ id: "2", status: "new" }),
      buildInquiry({ id: "3", status: "in_progress" }),
    ];

    const stats = computeApplicantInquiryStats(inquiries, {
      unreadInquiryIds: new Set(),
    });

    expect(stats.awaitingResponse).toBe(2);
  });

  it("highUrgencyUnresolvedはresolvedを含めない", () => {
    const inquiries = [
      buildInquiry({ id: "1", status: "new", urgency: "high" }),
      buildInquiry({ id: "2", status: "resolved", urgency: "high" }),
    ];

    const stats = computeApplicantInquiryStats(inquiries, {
      unreadInquiryIds: new Set(),
    });

    expect(stats.highUrgencyUnresolved).toBe(1);
  });

  it("byUrgencyUnresolvedは未解決のみをhigh/medium/low別に集計する", () => {
    const inquiries = [
      buildInquiry({ id: "1", status: "new", urgency: "high" }),
      buildInquiry({ id: "2", status: "in_progress", urgency: "medium" }),
      buildInquiry({ id: "3", status: "resolved", urgency: "low" }),
    ];

    const stats = computeApplicantInquiryStats(inquiries, {
      unreadInquiryIds: new Set(),
    });

    expect(stats.byUrgencyUnresolved).toEqual({ high: 1, medium: 1, low: 0 });
  });

  it("byCategoryは案件種別ごとの件数を返す", () => {
    const inquiries = [
      buildInquiry({ id: "1", category: "defect" }),
      buildInquiry({ id: "2", category: "defect" }),
      buildInquiry({ id: "3", category: "order" }),
    ];

    const stats = computeApplicantInquiryStats(inquiries, {
      unreadInquiryIds: new Set(),
      referenceDate,
    });

    expect(stats.byCategory).toEqual({ defect: 2, order: 1, system: 0, other: 0 });
  });

  it("staleAwaitingResponseはstatus=newかつ72時間以上経過の件数", () => {
    const inquiries = [
      buildInquiry({
        id: "1",
        status: "new",
        createdAt: new Date(referenceDate.getTime() - 100 * 3_600_000).toISOString(),
      }),
      buildInquiry({
        id: "2",
        status: "new",
        createdAt: new Date(referenceDate.getTime() - 1 * 3_600_000).toISOString(),
      }),
      buildInquiry({
        id: "3",
        status: "in_progress",
        createdAt: new Date(referenceDate.getTime() - 100 * 3_600_000).toISOString(),
      }),
    ];

    const stats = computeApplicantInquiryStats(inquiries, {
      unreadInquiryIds: new Set(),
      referenceDate,
    });

    expect(stats.staleAwaitingResponse).toBe(1);
  });

  it("todayCountはreferenceDate基準の当日件数をstatusを問わず数える", () => {
    const inquiries = [
      buildInquiry({ id: "1", status: "resolved", createdAt: referenceDate.toISOString() }),
      buildInquiry({
        id: "2",
        status: "new",
        createdAt: new Date(referenceDate.getTime() - 10 * 86_400_000).toISOString(),
      }),
    ];

    const stats = computeApplicantInquiryStats(inquiries, {
      unreadInquiryIds: new Set(),
      referenceDate,
    });

    expect(stats.todayCount).toBe(1);
  });

  it("oldestUnresolvedHoursは未解決0件ならnull、未解決があれば最古の経過時間", () => {
    const empty = computeApplicantInquiryStats([], {
      unreadInquiryIds: new Set(),
      referenceDate,
    });
    expect(empty.oldestUnresolvedHours).toBeNull();

    const withUnresolved = computeApplicantInquiryStats(
      [
        buildInquiry({
          id: "1",
          status: "new",
          createdAt: new Date(referenceDate.getTime() - 5 * 3_600_000).toISOString(),
        }),
      ],
      { unreadInquiryIds: new Set(), referenceDate }
    );
    expect(withUnresolved.oldestUnresolvedHours).toBeCloseTo(5);
  });
});

describe("toUrgencyRows", () => {
  it("high/medium/lowを常に3行固定で返す", () => {
    const stats = computeApplicantInquiryStats([], {
      unreadInquiryIds: new Set(),
    });

    const rows = toUrgencyRows(stats);

    expect(rows.map((row) => row.urgency)).toEqual(["high", "medium", "low"]);
  });

  it("3行のcount最大値を100%とした共有スケールでbarPercentを算出する", () => {
    const inquiries = [
      buildInquiry({ id: "1", status: "new", urgency: "high" }),
      buildInquiry({ id: "2", status: "new", urgency: "high" }),
      buildInquiry({ id: "3", status: "new", urgency: "medium" }),
    ];
    const stats = computeApplicantInquiryStats(inquiries, {
      unreadInquiryIds: new Set(),
    });

    const rows = toUrgencyRows(stats);

    expect(rows.find((row) => row.urgency === "high")?.barPercent).toBe(100);
    expect(rows.find((row) => row.urgency === "medium")?.barPercent).toBe(50);
    expect(rows.find((row) => row.urgency === "low")?.barPercent).toBe(0);
  });
});
