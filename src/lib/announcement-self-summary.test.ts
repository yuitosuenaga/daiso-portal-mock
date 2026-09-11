import { describe, expect, it } from "vitest";

import {
  computeAnnouncementSelfSummary,
  countAnnouncementsByCategory,
  toAnnouncementCategoryBarRows,
  toAnnouncementStatusBarRows,
} from "@/lib/announcement-self-summary";
import type { Announcement } from "@/types/announcement";
import type { AnnouncementSelfStatus } from "@/types/announcement-recipient";

const NONE: AnnouncementSelfStatus = { confirmedAt: null, completedAt: null };
const CONFIRMED_ONLY: AnnouncementSelfStatus = {
  confirmedAt: "2026-01-01T00:00:00.000Z",
  completedAt: null,
};
const CONFIRMED_AND_COMPLETED: AnnouncementSelfStatus = {
  confirmedAt: "2026-01-01T00:00:00.000Z",
  completedAt: "2026-01-02T00:00:00.000Z",
};

describe("computeAnnouncementSelfSummary", () => {
  it("未確認（confirmedAtがnull）はunconfirmedに計上する", () => {
    const result = computeAnnouncementSelfSummary(
      [{ id: "a1", actionRequired: true }],
      new Map([["a1", NONE]])
    );

    expect(result).toEqual({
      total: 1,
      unconfirmed: 1,
      confirmedActionPending: 0,
      confirmedComplete: 0,
    });
  });

  it("未確認かつ要対応の場合はunconfirmedのみに計上し、confirmedActionPendingには入れない（排他性）", () => {
    const result = computeAnnouncementSelfSummary(
      [{ id: "a1", actionRequired: true }],
      new Map([["a1", NONE]])
    );

    expect(result.unconfirmed).toBe(1);
    expect(result.confirmedActionPending).toBe(0);
    expect(result.confirmedComplete).toBe(0);
  });

  it("確認済み・要対応・対応未完了はconfirmedActionPendingに計上する", () => {
    const result = computeAnnouncementSelfSummary(
      [{ id: "a1", actionRequired: true }],
      new Map([["a1", CONFIRMED_ONLY]])
    );

    expect(result).toEqual({
      total: 1,
      unconfirmed: 0,
      confirmedActionPending: 1,
      confirmedComplete: 0,
    });
  });

  it("確認済み・要対応・対応完了済みはconfirmedCompleteに計上する", () => {
    const result = computeAnnouncementSelfSummary(
      [{ id: "a1", actionRequired: true }],
      new Map([["a1", CONFIRMED_AND_COMPLETED]])
    );

    expect(result).toEqual({
      total: 1,
      unconfirmed: 0,
      confirmedActionPending: 0,
      confirmedComplete: 1,
    });
  });

  it("確認済みだがactionRequiredが偽の場合はconfirmedCompleteに計上する（元々対応不要）", () => {
    const result = computeAnnouncementSelfSummary(
      [{ id: "a1", actionRequired: false }],
      new Map([["a1", CONFIRMED_ONLY]])
    );

    expect(result).toEqual({
      total: 1,
      unconfirmed: 0,
      confirmedActionPending: 0,
      confirmedComplete: 1,
    });
  });

  it("Mapに項目が無い場合は未確認扱いになる（スパース保持の仕様に合わせる）", () => {
    const result = computeAnnouncementSelfSummary([{ id: "a1", actionRequired: true }], new Map());

    expect(result).toEqual({
      total: 1,
      unconfirmed: 1,
      confirmedActionPending: 0,
      confirmedComplete: 0,
    });
  });

  it("複数件のtotal・各カウントが正しく集計される（3区分の合計はtotalと一致する）", () => {
    const result = computeAnnouncementSelfSummary(
      [
        { id: "a1", actionRequired: true },
        { id: "a2", actionRequired: true },
        { id: "a3", actionRequired: false },
        { id: "a4", actionRequired: true },
      ],
      new Map([
        ["a1", NONE],
        ["a2", CONFIRMED_ONLY],
        ["a3", CONFIRMED_ONLY],
        ["a4", CONFIRMED_AND_COMPLETED],
      ])
    );

    expect(result).toEqual({
      total: 4,
      unconfirmed: 1,
      confirmedActionPending: 1,
      confirmedComplete: 2,
    });
    expect(result.unconfirmed + result.confirmedActionPending + result.confirmedComplete).toBe(
      result.total
    );
  });

  it("空配列を渡した場合は全て0になる", () => {
    const result = computeAnnouncementSelfSummary([], new Map());

    expect(result).toEqual({
      total: 0,
      unconfirmed: 0,
      confirmedActionPending: 0,
      confirmedComplete: 0,
    });
  });
});

describe("toAnnouncementStatusBarRows", () => {
  it("3区分を固定順で行データに変換し、最大値を100%とするbarPercentを付与する", () => {
    const summary = { total: 10, unconfirmed: 2, confirmedActionPending: 4, confirmedComplete: 4 };
    const rows = toAnnouncementStatusBarRows(summary, {
      unconfirmed: "未確認",
      confirmedActionPending: "確認済み・対応未完了",
      confirmedComplete: "確認済み・対応完了",
    });

    expect(rows).toEqual([
      { key: "unconfirmed", label: "未確認", count: 2, barPercent: 50 },
      { key: "confirmedActionPending", label: "確認済み・対応未完了", count: 4, barPercent: 100 },
      { key: "confirmedComplete", label: "確認済み・対応完了", count: 4, barPercent: 100 },
    ]);
  });

  it("全て0件でも3行を保持し、barPercentは0になる", () => {
    const summary = { total: 0, unconfirmed: 0, confirmedActionPending: 0, confirmedComplete: 0 };
    const rows = toAnnouncementStatusBarRows(summary, {
      unconfirmed: "未確認",
      confirmedActionPending: "確認済み・対応未完了",
      confirmedComplete: "確認済み・対応完了",
    });

    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.barPercent === 0)).toBe(true);
  });
});

describe("countAnnouncementsByCategory", () => {
  it("カテゴリ別に件数を集計し、0件のカテゴリも0で保持する", () => {
    const announcements: Pick<Announcement, "category">[] = [
      { category: "maintenance" },
      { category: "maintenance" },
      { category: "other" },
    ];

    expect(countAnnouncementsByCategory(announcements)).toEqual({
      maintenance: 2,
      policy: 0,
      incident: 0,
      other: 1,
    });
  });

  it("空配列を渡した場合は全カテゴリ0になる", () => {
    expect(countAnnouncementsByCategory([])).toEqual({
      maintenance: 0,
      policy: 0,
      incident: 0,
      other: 0,
    });
  });
});

describe("toAnnouncementCategoryBarRows", () => {
  it("固定順4行に変換し、最大値を100%とするbarPercentを付与する", () => {
    const byCategory = { maintenance: 1, policy: 3, incident: 0, other: 2 };
    const rows = toAnnouncementCategoryBarRows(byCategory, {
      maintenance: "メンテナンス",
      policy: "制度変更",
      incident: "障害情報",
      other: "その他",
    });

    expect(rows).toEqual([
      { key: "maintenance", label: "メンテナンス", count: 1, barPercent: (1 / 3) * 100 },
      { key: "policy", label: "制度変更", count: 3, barPercent: 100 },
      { key: "incident", label: "障害情報", count: 0, barPercent: 0 },
      { key: "other", label: "その他", count: 2, barPercent: (2 / 3) * 100 },
    ]);
  });
});
