import { describe, expect, it } from "vitest";

import {
  computeHelpdeskInquiryStats,
  toStaffLoadRows,
  toStatusSegments,
} from "@/lib/helpdesk-inquiry-stats";
import type { Inquiry } from "@/types/inquiry";

function makeInquiry(overrides: Partial<Inquiry> & { id: string }): Inquiry {
  return {
    title: "テストタイトル",
    category: "defect",
    urgency: "medium",
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

describe("computeHelpdeskInquiryStats", () => {
  const referenceDate = new Date("2026-07-22T15:00:00.000Z"); // 2026-07-23T00:00:00+09:00

  it("空配列の場合は全項目が0になる", () => {
    const result = computeHelpdeskInquiryStats([]);

    expect(result).toEqual({
      total: 0,
      byStatus: { new: 0, in_progress: 0, resolved: 0 },
      unresolved: 0,
      unclaimed: 0,
      unclaimedHighUrgency: 0,
      claimedByStaff: [],
      claimedTotal: 0,
      todayCount: 0,
    });
  });

  it("status別件数を正しく集計する", () => {
    const inquiries = [
      makeInquiry({ id: "1", status: "new" }),
      makeInquiry({ id: "2", status: "new" }),
      makeInquiry({ id: "3", status: "in_progress" }),
      makeInquiry({ id: "4", status: "resolved" }),
    ];

    const result = computeHelpdeskInquiryStats(inquiries, { referenceDate });

    expect(result.byStatus).toEqual({ new: 2, in_progress: 1, resolved: 1 });
    expect(result.total).toBe(4);
    expect(result.unresolved).toBe(3);
  });

  it("resolvedはunclaimedの母集団に含めない（claim無しでも未着手扱いしない）", () => {
    const inquiries = [
      makeInquiry({ id: "1", status: "resolved", claim: null }),
      makeInquiry({ id: "2", status: "new", claim: null }),
    ];

    const result = computeHelpdeskInquiryStats(inquiries, { referenceDate });

    expect(result.unclaimed).toBe(1);
  });

  it("未対応かつclaim=nullの件数をunclaimedとして算出し、urgency=highの件数を別途算出する", () => {
    const inquiries = [
      makeInquiry({ id: "1", status: "new", urgency: "high", claim: null }),
      makeInquiry({ id: "2", status: "in_progress", urgency: "low", claim: null }),
      makeInquiry({
        id: "3",
        status: "new",
        urgency: "high",
        claim: { staffName: "田中", claimedAt: "2026-07-01T00:00:00.000Z" },
      }),
    ];

    const result = computeHelpdeskInquiryStats(inquiries, { referenceDate });

    expect(result.unclaimed).toBe(2);
    expect(result.unclaimedHighUrgency).toBe(1);
  });

  it("対応者別の件数をcount降順、同数はstaffName昇順で集計する", () => {
    const inquiries = [
      makeInquiry({ id: "1", status: "in_progress", claim: { staffName: "佐藤", claimedAt: "2026-07-01T00:00:00.000Z" } }),
      makeInquiry({ id: "2", status: "new", claim: { staffName: "田中", claimedAt: "2026-07-01T00:00:00.000Z" } }),
      makeInquiry({ id: "3", status: "in_progress", claim: { staffName: "田中", claimedAt: "2026-07-01T00:00:00.000Z" } }),
      makeInquiry({ id: "4", status: "new", claim: { staffName: "鈴木", claimedAt: "2026-07-01T00:00:00.000Z" } }),
    ];

    const result = computeHelpdeskInquiryStats(inquiries, { referenceDate });

    expect(result.claimedByStaff).toEqual([
      { staffName: "田中", count: 2 },
      { staffName: "佐藤", count: 1 },
      { staffName: "鈴木", count: 1 },
    ]);
  });

  it("unclaimed + claimedTotal === unresolved が常に成立する", () => {
    const inquiries = [
      makeInquiry({ id: "1", status: "new", claim: null }),
      makeInquiry({ id: "2", status: "in_progress", claim: { staffName: "田中", claimedAt: "2026-07-01T00:00:00.000Z" } }),
      makeInquiry({ id: "3", status: "in_progress", claim: { staffName: "佐藤", claimedAt: "2026-07-01T00:00:00.000Z" } }),
      makeInquiry({ id: "4", status: "resolved", claim: null }),
    ];

    const result = computeHelpdeskInquiryStats(inquiries, { referenceDate });

    expect(result.unclaimed + result.claimedTotal).toBe(result.unresolved);
  });

  it("JST基準で当日受付件数をstatusを問わず算出する", () => {
    const inquiries = [
      makeInquiry({ id: "1", status: "resolved", createdAt: "2026-07-22T15:00:00.000Z" }), // JST 07-23 00:00
      makeInquiry({ id: "2", status: "new", createdAt: "2026-07-22T14:59:59.000Z" }), // JST 07-22 23:59:59
    ];

    const result = computeHelpdeskInquiryStats(inquiries, { referenceDate });

    expect(result.todayCount).toBe(1);
  });
});

describe("toStatusSegments", () => {
  it("total=0の場合は空配列を返す", () => {
    expect(toStatusSegments({ new: 0, in_progress: 0, resolved: 0 }, 0)).toEqual([]);
  });

  it("件数0のstatusをセグメントから除外する", () => {
    const segments = toStatusSegments({ new: 2, in_progress: 0, resolved: 0 }, 2);

    expect(segments).toEqual([{ status: "new", count: 2, percent: 100 }]);
  });

  it("パーセントの合計が必ず100になる（3等分で丸め誤差が出るケース）", () => {
    const segments = toStatusSegments({ new: 1, in_progress: 1, resolved: 1 }, 3);

    expect(segments.reduce((sum, s) => sum + s.percent, 0)).toBe(100);
    expect(segments.map((s) => s.count)).toEqual([1, 1, 1]);
  });
});

describe("toStaffLoadRows", () => {
  it("未着手0件・対応者なしの場合は未着手行のみ返す", () => {
    const rows = toStaffLoadRows({
      total: 0,
      byStatus: { new: 0, in_progress: 0, resolved: 0 },
      unresolved: 0,
      unclaimed: 0,
      unclaimedHighUrgency: 0,
      claimedByStaff: [],
      claimedTotal: 0,
      todayCount: 0,
    });

    expect(rows).toEqual([
      { key: "unclaimed", kind: "unclaimed", label: null, count: 0, barPercent: 0 },
    ]);
  });

  it("7人以上のとき上位6名を表示し残りをothersに畳む", () => {
    const claimedByStaff = Array.from({ length: 8 }, (_, i) => ({
      staffName: `staff-${i}`,
      count: 8 - i,
    }));

    const rows = toStaffLoadRows({
      total: 40,
      byStatus: { new: 4, in_progress: 32, resolved: 4 },
      unresolved: 36,
      unclaimed: 0,
      unclaimedHighUrgency: 0,
      claimedByStaff,
      claimedTotal: claimedByStaff.reduce((s, c) => s + c.count, 0),
      todayCount: 0,
    });

    const others = rows.find((r) => r.kind === "others");
    expect(rows.filter((r) => r.kind === "staff")).toHaveLength(6);
    expect(others).toMatchObject({ staffCount: 2, count: 2 + 1 }); // counts for staff-6(2) + staff-7(1)
  });

  it("barPercentは全行のcount最大値を100とした相対値になる", () => {
    const rows = toStaffLoadRows({
      total: 10,
      byStatus: { new: 2, in_progress: 8, resolved: 0 },
      unresolved: 10,
      unclaimed: 2,
      unclaimedHighUrgency: 0,
      claimedByStaff: [{ staffName: "田中", count: 8 }],
      claimedTotal: 8,
      todayCount: 0,
    });

    expect(rows.find((r) => r.kind === "unclaimed")?.barPercent).toBe(25);
    expect(rows.find((r) => r.kind === "staff")?.barPercent).toBe(100);
  });
});
