import { describe, expect, it } from "vitest";

import {
  EMPTY_HELPDESK_INQUIRY_FILTERS,
  filterInquiriesForHelpdesk,
  normalizeHelpdeskInquiryFilters,
  sortInquiriesForHelpdesk,
} from "@/lib/helpdesk-inquiry-list";
import type { Inquiry } from "@/types/inquiry";

function buildInquiry(overrides: Partial<Inquiry>): Inquiry {
  return {
    id: "inquiry-x",
    title: "テストタイトル",
    category: "defect",
    urgency: "low",
    storeRegion: "Tokyo",
    originalText: "テスト本文",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-06-01T00:00:00.000Z",
    submittedBy: { companyName: "Test Co.", country: "JP" },
    ...overrides,
  };
}

describe("sortInquiriesForHelpdesk", () => {
  it("対応状況（新規→対応中→解決済み）を最優先の基準として並び替える", () => {
    const inquiries = [
      buildInquiry({ id: "resolved", status: "resolved", urgency: "high" }),
      buildInquiry({ id: "new", status: "new", urgency: "low" }),
      buildInquiry({ id: "in_progress", status: "in_progress", urgency: "medium" }),
    ];

    const result = sortInquiriesForHelpdesk(inquiries);

    expect(result.map((item) => item.id)).toEqual([
      "new",
      "in_progress",
      "resolved",
    ]);
  });

  it("同一対応状況内では緊急度（高→中→低）で並び替える", () => {
    const inquiries = [
      buildInquiry({ id: "low", status: "new", urgency: "low", createdAt: "2026-06-03T00:00:00.000Z" }),
      buildInquiry({ id: "high", status: "new", urgency: "high", createdAt: "2026-06-01T00:00:00.000Z" }),
      buildInquiry({ id: "medium", status: "new", urgency: "medium", createdAt: "2026-06-02T00:00:00.000Z" }),
    ];

    const result = sortInquiriesForHelpdesk(inquiries);

    expect(result.map((item) => item.id)).toEqual(["high", "medium", "low"]);
  });

  it("同一対応状況・同一緊急度内では受付日時（createdAt）の昇順（古いものが先）で並び替える", () => {
    const inquiries = [
      buildInquiry({ id: "newer", status: "new", urgency: "high", createdAt: "2026-06-05T00:00:00.000Z" }),
      buildInquiry({ id: "older", status: "new", urgency: "high", createdAt: "2026-06-01T00:00:00.000Z" }),
    ];

    const result = sortInquiriesForHelpdesk(inquiries);

    expect(result.map((item) => item.id)).toEqual(["older", "newer"]);
  });

  it("元の配列を変更しない", () => {
    const inquiries = [buildInquiry({ id: "a" }), buildInquiry({ id: "b" })];
    const original = [...inquiries];

    sortInquiriesForHelpdesk(inquiries);

    expect(inquiries).toEqual(original);
  });
});

describe("filterInquiriesForHelpdesk", () => {
  const inquiries = [
    buildInquiry({
      id: "1",
      category: "defect",
      status: "new",
      title: "商品破損の報告",
      submittedBy: { companyName: "Daiso Vietnam Co., Ltd.", country: "VN" },
      originalText: "商品が破損しています。",
    }),
    buildInquiry({
      id: "2",
      category: "order",
      status: "resolved",
      title: "追加発注のお願い",
      submittedBy: { companyName: "Daiso USA Inc.", country: "US" },
      originalText: "Additional order request.",
    }),
  ];

  it("条件を指定しない場合は全件を返す", () => {
    const result = filterInquiriesForHelpdesk(
      inquiries,
      EMPTY_HELPDESK_INQUIRY_FILTERS
    );

    expect(result).toHaveLength(2);
  });

  it("会社名で絞り込む（部分一致・大文字小文字を区別しない）", () => {
    const result = filterInquiriesForHelpdesk(inquiries, {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      companyName: "vietnam",
    });

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("キーワードで本文を部分一致検索する", () => {
    const result = filterInquiriesForHelpdesk(inquiries, {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      keyword: "order request",
    });

    expect(result.map((item) => item.id)).toEqual(["2"]);
  });

  it("キーワードでタイトル（title）を部分一致検索する", () => {
    const result = filterInquiriesForHelpdesk(inquiries, {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      keyword: "破損",
    });

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("対応状況で絞り込む", () => {
    const result = filterInquiriesForHelpdesk(inquiries, {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      status: "resolved",
    });

    expect(result.map((item) => item.id)).toEqual(["2"]);
  });

  it("対応状況を指定しない既定状態では全件を返す", () => {
    const result = filterInquiriesForHelpdesk(
      inquiries,
      EMPTY_HELPDESK_INQUIRY_FILTERS
    );

    expect(result).toHaveLength(2);
  });

  it("国で絞り込む", () => {
    const result = filterInquiriesForHelpdesk(inquiries, {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      country: "US",
    });

    expect(result.map((item) => item.id)).toEqual(["2"]);
  });

  it("カテゴリで絞り込む", () => {
    const result = filterInquiriesForHelpdesk(inquiries, {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      category: "defect",
    });

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("複数条件はAND条件で適用される", () => {
    const result = filterInquiriesForHelpdesk(inquiries, {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      country: "US",
      category: "defect",
    });

    expect(result).toHaveLength(0);
  });

  it("緊急度で絞り込む", () => {
    const withUrgency = [
      ...inquiries,
      buildInquiry({ id: "3", urgency: "high", status: "new" }),
    ];

    const result = filterInquiriesForHelpdesk(withUrgency, {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      urgency: "high",
    });

    expect(result.map((item) => item.id)).toEqual(["3"]);
  });

  it("unclaimedOnly=trueのとき、claimがない未対応件のみ返す（resolvedは除外しない点に注意）", () => {
    const withClaim = [
      buildInquiry({ id: "unclaimed", status: "new", claim: null }),
      buildInquiry({
        id: "claimed",
        status: "new",
        claim: { staffName: "田中", claimedAt: "2026-06-01T00:00:00.000Z" },
      }),
    ];

    const result = filterInquiriesForHelpdesk(withClaim, {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      unclaimedOnly: true,
    });

    expect(result.map((item) => item.id)).toEqual(["unclaimed"]);
  });

  it("claimedByで対応者名で絞り込む", () => {
    const withClaim = [
      buildInquiry({
        id: "tanaka",
        claim: { staffName: "田中", claimedAt: "2026-06-01T00:00:00.000Z" },
      }),
      buildInquiry({
        id: "suzuki",
        claim: { staffName: "鈴木", claimedAt: "2026-06-01T00:00:00.000Z" },
      }),
    ];

    const result = filterInquiriesForHelpdesk(withClaim, {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      claimedBy: "田中",
    });

    expect(result.map((item) => item.id)).toEqual(["tanaka"]);
  });

  it("unresolvedOnly=trueのとき、new・in_progressのみ返す（resolvedは除外）", () => {
    const result = filterInquiriesForHelpdesk(inquiries, {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      unresolvedOnly: true,
    });

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("unclaimedOnlyとunresolvedOnlyを併用するとresolvedかつ未着手の件は除外される", () => {
    const withResolvedUnclaimed = [
      buildInquiry({ id: "unclaimed-new", status: "new", claim: null }),
      buildInquiry({ id: "unclaimed-resolved", status: "resolved", claim: null }),
    ];

    const result = filterInquiriesForHelpdesk(withResolvedUnclaimed, {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      unclaimedOnly: true,
      unresolvedOnly: true,
    });

    expect(result.map((item) => item.id)).toEqual(["unclaimed-new"]);
  });

  it("agingでバケット完全一致で絞り込む", () => {
    const referenceDate = new Date("2026-06-04T00:00:00.000Z");
    const target = [
      buildInquiry({ id: "recent", createdAt: "2026-06-03T12:00:00.000Z" }),
      buildInquiry({ id: "old", createdAt: "2026-05-01T00:00:00.000Z" }),
    ];

    const result = filterInquiriesForHelpdesk(
      target,
      { ...EMPTY_HELPDESK_INQUIRY_FILTERS, aging: "lt24h" },
      { referenceDate }
    );

    expect(result.map((item) => item.id)).toEqual(["recent"]);
  });

  it("receivedOnで受付日（日本時間基準）が一致する問い合わせのみ返す", () => {
    const target = [
      buildInquiry({ id: "jst-morning", createdAt: "2026-06-01T23:30:00.000Z" }),
      buildInquiry({ id: "other-day", createdAt: "2026-06-01T10:00:00.000Z" }),
    ];

    const result = filterInquiriesForHelpdesk(target, {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      receivedOn: "2026-06-02",
    });

    expect(result.map((item) => item.id)).toEqual(["jst-morning"]);
  });
});

describe("normalizeHelpdeskInquiryFilters", () => {
  it("矛盾がない場合は無変更", () => {
    const filters = { ...EMPTY_HELPDESK_INQUIRY_FILTERS, category: "defect" };
    expect(normalizeHelpdeskInquiryFilters(filters)).toEqual(filters);
  });

  it("unclaimedOnlyをONにすると、claimedByが解除されunresolvedOnlyが有効になる", () => {
    const filters = {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      claimedBy: "田中",
      unclaimedOnly: true,
    };
    const result = normalizeHelpdeskInquiryFilters(filters, ["unclaimedOnly"]);

    expect(result.unclaimedOnly).toBe(true);
    expect(result.claimedBy).toBe("");
    expect(result.unresolvedOnly).toBe(true);
  });

  it("claimedByを選ぶと、unclaimedOnlyは解除されるが、unresolvedOnlyは強制されない（対応者絞り込みは対応状況を問わず意味を持つため）", () => {
    const filters = {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      unclaimedOnly: true,
      claimedBy: "田中",
    };
    const result = normalizeHelpdeskInquiryFilters(filters, ["claimedBy"]);

    expect(result.claimedBy).toBe("田中");
    expect(result.unclaimedOnly).toBe(false);
    expect(result.unresolvedOnly).toBe(false);
  });

  it("countryを選ぶと、unresolvedOnlyが未設定でも自動的にtrueになる", () => {
    const filters = { ...EMPTY_HELPDESK_INQUIRY_FILTERS, country: "VN" };
    const result = normalizeHelpdeskInquiryFilters(filters, ["country"]);

    expect(result.country).toBe("VN");
    expect(result.unresolvedOnly).toBe(true);
  });

  it("statusをresolvedに変更したとき、unresolvedOnlyが解除される", () => {
    const filters = {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      unresolvedOnly: true,
      status: "resolved" as const,
    };
    const result = normalizeHelpdeskInquiryFilters(filters, ["status"]);

    expect(result.status).toBe("resolved");
    expect(result.unresolvedOnly).toBe(false);
  });

  it("unresolvedOnlyを明示的にOFFにすると、unclaimedOnly・aging・countryが解除される", () => {
    const filters = {
      ...EMPTY_HELPDESK_INQUIRY_FILTERS,
      unclaimedOnly: true,
      aging: "over24h" as const,
      country: "VN",
      unresolvedOnly: true,
    };
    const result = normalizeHelpdeskInquiryFilters(
      { ...filters, unresolvedOnly: false },
      ["unresolvedOnly"]
    );

    expect(result.unresolvedOnly).toBe(false);
    expect(result.unclaimedOnly).toBe(false);
    expect(result.aging).toBe("");
    expect(result.country).toBe("");
  });

  it("再現シナリオ: 対応者行クリック→status=resolved選択→再度同じ対応者行をクリックすると詰み状態にならない", () => {
    // 1. 対応者行クリック: {claimedBy:"田中", unresolvedOnly:true, unclaimedOnly:false}
    let filters = normalizeHelpdeskInquiryFilters(
      {
        ...EMPTY_HELPDESK_INQUIRY_FILTERS,
        claimedBy: "田中",
        unresolvedOnly: true,
        unclaimedOnly: false,
      },
      ["claimedBy", "unresolvedOnly", "unclaimedOnly"]
    );
    expect(filters.claimedBy).toBe("田中");
    expect(filters.unresolvedOnly).toBe(true);

    // 2. 対応状況セレクトでresolvedを選ぶ: {status:"resolved"}（claimedBy・unresolvedOnlyには触れない）
    filters = normalizeHelpdeskInquiryFilters({ ...filters, status: "resolved" }, ["status"]);
    expect(filters.status).toBe("resolved");
    expect(filters.unresolvedOnly).toBe(false);
    expect(filters.claimedBy).toBe("田中"); // claimedBy自体はunresolvedOnlyに依存しても解除対象ではない範囲を確認

    // 3. 再度同じ対応者行をクリック: {claimedBy:"田中", unresolvedOnly:true, unclaimedOnly:false}
    filters = normalizeHelpdeskInquiryFilters(
      { ...filters, claimedBy: "田中", unresolvedOnly: true, unclaimedOnly: false },
      ["claimedBy", "unresolvedOnly", "unclaimedOnly"]
    );
    expect(filters.status).toBe(""); // statusは今回変更されていないため解除される
    expect(filters.claimedBy).toBe("田中");
    expect(filters.unresolvedOnly).toBe(true);
  });
});
