import { describe, expect, it } from "vitest";

import { computeUnresolvedInquiriesKpi } from "@/lib/dashboard-unresolved-inquiries-kpi";
import type { Inquiry } from "@/types/inquiry";

function makeInquiry(overrides: Partial<Inquiry> & { id: string }): Inquiry {
  return {
    title: "テストタイトル",
    category: "defect",
    urgency: "high",
    storeRegion: "Tokyo",
    originalText: "テスト本文",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-07-01T00:00:00.000Z",
    submittedBy: { companyName: "Daiso Test Co.", country: "JP" },
    claim: null,
    ...overrides,
  };
}

describe("computeUnresolvedInquiriesKpi", () => {
  const referenceDate = new Date(2026, 6, 23, 15, 0, 0); // 2026-07-23（テスト実行環境のローカル日付）

  it("新規・対応中の件数を未対応件数として算出する", () => {
    const inquiries = [
      makeInquiry({ id: "1", status: "new" }),
      makeInquiry({ id: "2", status: "in_progress" }),
      makeInquiry({ id: "3", status: "resolved" }),
    ];

    const result = computeUnresolvedInquiriesKpi(inquiries, referenceDate);

    expect(result.total).toBe(2);
  });

  it("受付日時が当日（ローカル日付）の未対応件数のみを本日受付件数として算出する", () => {
    const inquiries = [
      makeInquiry({
        id: "1",
        status: "new",
        createdAt: new Date(2026, 6, 23, 9, 0, 0).toISOString(),
      }),
      makeInquiry({
        id: "2",
        status: "in_progress",
        createdAt: new Date(2026, 6, 23, 23, 59, 0).toISOString(),
      }),
      makeInquiry({
        id: "3",
        status: "new",
        createdAt: new Date(2026, 6, 22, 23, 59, 0).toISOString(),
      }),
    ];

    const result = computeUnresolvedInquiriesKpi(inquiries, referenceDate);

    expect(result.total).toBe(3);
    expect(result.today).toBe(2);
  });

  it("前日23:59と当日0:00の境界を正しく区別する", () => {
    const inquiries = [
      makeInquiry({
        id: "1",
        status: "new",
        createdAt: new Date(2026, 6, 22, 23, 59, 59).toISOString(),
      }),
      makeInquiry({
        id: "2",
        status: "new",
        createdAt: new Date(2026, 6, 23, 0, 0, 0).toISOString(),
      }),
    ];

    const result = computeUnresolvedInquiriesKpi(inquiries, referenceDate);

    expect(result.today).toBe(1);
  });

  it("new/in_progress以外（resolved）は本日受付件数からも除外する", () => {
    const inquiries = [
      makeInquiry({
        id: "1",
        status: "resolved",
        createdAt: new Date(2026, 6, 23, 9, 0, 0).toISOString(),
      }),
    ];

    const result = computeUnresolvedInquiriesKpi(inquiries, referenceDate);

    expect(result.total).toBe(0);
    expect(result.today).toBe(0);
  });

  it("対象の問い合わせが0件の場合は両方とも0になる", () => {
    const result = computeUnresolvedInquiriesKpi([], referenceDate);

    expect(result.total).toBe(0);
    expect(result.today).toBe(0);
  });

  describe("日本時間（JST）基準での日付境界判定（テスト実行環境のタイムゾーンに依存しない）", () => {
    // 2026-07-23T00:00:00+09:00 = 2026-07-22T15:00:00Z。UTC等、日本時間と異なる
    // タイムゾーンで実行されるサーバー環境でも「当日」がJST基準で判定されることを確認する。
    const jstReferenceInstant = new Date("2026-07-22T15:00:00.000Z");

    it("JST基準で前日23:59:59は本日受付に含めない", () => {
      const inquiries = [
        makeInquiry({
          id: "1",
          status: "new",
          createdAt: "2026-07-22T14:59:59.000Z", // 2026-07-22T23:59:59+09:00
        }),
      ];

      const result = computeUnresolvedInquiriesKpi(
        inquiries,
        jstReferenceInstant
      );

      expect(result.today).toBe(0);
    });

    it("JST基準で当日0:00:00ちょうどは本日受付に含める", () => {
      const inquiries = [
        makeInquiry({
          id: "1",
          status: "new",
          createdAt: "2026-07-22T15:00:00.000Z", // 2026-07-23T00:00:00+09:00
        }),
      ];

      const result = computeUnresolvedInquiriesKpi(
        inquiries,
        jstReferenceInstant
      );

      expect(result.today).toBe(1);
    });
  });
});
