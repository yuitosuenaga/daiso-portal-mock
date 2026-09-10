import { describe, expect, it } from "vitest";

import { computeAnnouncementSelfSummary } from "@/lib/announcement-self-summary";
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

    expect(result).toEqual({ total: 1, unconfirmed: 1, confirmedActionPending: 0 });
  });

  it("未確認かつ要対応の場合はunconfirmedのみに計上し、confirmedActionPendingには入れない（排他性）", () => {
    const result = computeAnnouncementSelfSummary(
      [{ id: "a1", actionRequired: true }],
      new Map([["a1", NONE]])
    );

    expect(result.unconfirmed).toBe(1);
    expect(result.confirmedActionPending).toBe(0);
  });

  it("確認済み・要対応・対応未完了はconfirmedActionPendingに計上する", () => {
    const result = computeAnnouncementSelfSummary(
      [{ id: "a1", actionRequired: true }],
      new Map([["a1", CONFIRMED_ONLY]])
    );

    expect(result).toEqual({ total: 1, unconfirmed: 0, confirmedActionPending: 1 });
  });

  it("確認済み・要対応・対応完了済みはどちらにも計上しない", () => {
    const result = computeAnnouncementSelfSummary(
      [{ id: "a1", actionRequired: true }],
      new Map([["a1", CONFIRMED_AND_COMPLETED]])
    );

    expect(result).toEqual({ total: 1, unconfirmed: 0, confirmedActionPending: 0 });
  });

  it("確認済みだがactionRequiredが偽の場合はどちらにも計上しない", () => {
    const result = computeAnnouncementSelfSummary(
      [{ id: "a1", actionRequired: false }],
      new Map([["a1", CONFIRMED_ONLY]])
    );

    expect(result).toEqual({ total: 1, unconfirmed: 0, confirmedActionPending: 0 });
  });

  it("Mapに項目が無い場合は未確認扱いになる（スパース保持の仕様に合わせる）", () => {
    const result = computeAnnouncementSelfSummary([{ id: "a1", actionRequired: true }], new Map());

    expect(result).toEqual({ total: 1, unconfirmed: 1, confirmedActionPending: 0 });
  });

  it("複数件のtotal・各カウントが正しく集計される", () => {
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

    expect(result).toEqual({ total: 4, unconfirmed: 1, confirmedActionPending: 1 });
  });

  it("空配列を渡した場合は全て0になる", () => {
    const result = computeAnnouncementSelfSummary([], new Map());

    expect(result).toEqual({ total: 0, unconfirmed: 0, confirmedActionPending: 0 });
  });
});
