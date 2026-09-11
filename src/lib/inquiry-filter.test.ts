import { describe, expect, it } from "vitest";

import {
  EMPTY_INQUIRY_FILTERS,
  filterInquiries,
  normalizeInquiryFilters,
} from "@/lib/inquiry-filter";
import type { Inquiry } from "@/types/inquiry";

function buildInquiry(overrides: Partial<Inquiry>): Inquiry {
  return {
    id: "inquiry-x",
    title: "サンプルの問い合わせ",
    category: "other",
    urgency: "medium",
    storeRegion: "関東",
    originalText: "サンプル本文です。",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-06-01T00:00:00.000Z",
    submittedBy: { companyName: "Test Company", country: "JP" },
    ...overrides,
  };
}

describe("filterInquiries", () => {
  const inquiries = [
    buildInquiry({
      id: "1",
      title: "商品破損についての問い合わせ",
      originalText: "納品された商品の一部に破損が見られます。",
      category: "defect",
      status: "new",
    }),
    buildInquiry({
      id: "2",
      title: "追加発注のお願い",
      originalText: "在庫が不足しているため追加発注をお願いします。",
      category: "order",
      status: "in_progress",
    }),
    buildInquiry({
      id: "3",
      title: "システム障害の報告",
      originalText: "ポータルにログインできない不具合が発生しています。",
      category: "system",
      status: "resolved",
    }),
  ];

  it("条件を指定しない場合は全件を順序を維持して返す", () => {
    const result = filterInquiries(inquiries, EMPTY_INQUIRY_FILTERS);

    expect(result.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it("キーワードでタイトルを部分一致検索する（大文字小文字を区別しない）", () => {
    const result = filterInquiries(inquiries, {
      ...EMPTY_INQUIRY_FILTERS,
      keyword: "破損",
    });

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("キーワードで自由記述（originalText）を部分一致検索する", () => {
    const result = filterInquiries(inquiries, {
      ...EMPTY_INQUIRY_FILTERS,
      keyword: "ログインできない",
    });

    expect(result.map((item) => item.id)).toEqual(["3"]);
  });

  it("対応状況で絞り込む", () => {
    const result = filterInquiries(inquiries, {
      ...EMPTY_INQUIRY_FILTERS,
      status: "in_progress",
    });

    expect(result.map((item) => item.id)).toEqual(["2"]);
  });

  it("案件種別で絞り込む", () => {
    const result = filterInquiries(inquiries, {
      ...EMPTY_INQUIRY_FILTERS,
      category: "system",
    });

    expect(result.map((item) => item.id)).toEqual(["3"]);
  });

  it("複数条件はAND条件で適用される", () => {
    const result = filterInquiries(inquiries, {
      ...EMPTY_INQUIRY_FILTERS,
      keyword: "問い合わせ",
      status: "new",
      category: "defect",
    });

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("条件に一致する問い合わせが無い場合は空配列を返す", () => {
    const result = filterInquiries(inquiries, {
      ...EMPTY_INQUIRY_FILTERS,
      keyword: "存在しない語句",
    });

    expect(result).toEqual([]);
  });

  it("元の配列を変更しない", () => {
    const original = [...inquiries];

    filterInquiries(inquiries, { ...EMPTY_INQUIRY_FILTERS, keyword: "破損" });

    expect(inquiries).toEqual(original);
  });

  it("緊急度で絞り込む", () => {
    const highUrgency = [
      ...inquiries,
      buildInquiry({ id: "4", urgency: "high" }),
    ];

    const result = filterInquiries(highUrgency, {
      ...EMPTY_INQUIRY_FILTERS,
      urgency: "high",
    });

    expect(result.map((item) => item.id)).toEqual(["4"]);
  });

  it("unreadOnly=trueのとき、unreadInquiryIdsに含まれる問い合わせのみ返す", () => {
    const result = filterInquiries(
      inquiries,
      { ...EMPTY_INQUIRY_FILTERS, unreadOnly: true },
      { unreadInquiryIds: new Set(["2"]) }
    );

    expect(result.map((item) => item.id)).toEqual(["2"]);
  });

  it("unreadOnly=trueでunreadInquiryIdsが渡されない場合は空配列を返す", () => {
    const result = filterInquiries(inquiries, {
      ...EMPTY_INQUIRY_FILTERS,
      unreadOnly: true,
    });

    expect(result).toEqual([]);
  });

  it("unresolvedOnly=trueのとき、new・in_progressのみ返す（resolvedは除外）", () => {
    const result = filterInquiries(inquiries, {
      ...EMPTY_INQUIRY_FILTERS,
      unresolvedOnly: true,
    });

    expect(result.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("agingでバケット完全一致で絞り込む", () => {
    const referenceDate = new Date("2026-06-04T00:00:00.000Z");
    const target = [
      buildInquiry({ id: "recent", createdAt: "2026-06-03T12:00:00.000Z" }),
      buildInquiry({ id: "old", createdAt: "2026-05-01T00:00:00.000Z" }),
    ];

    const result = filterInquiries(
      target,
      { ...EMPTY_INQUIRY_FILTERS, aging: "lt24h" },
      { referenceDate }
    );

    expect(result.map((item) => item.id)).toEqual(["recent"]);
  });

  it("agingでプリセット（over72h）による絞り込みができる", () => {
    const referenceDate = new Date("2026-06-10T00:00:00.000Z");
    const target = [
      buildInquiry({ id: "stale", createdAt: "2026-06-01T00:00:00.000Z" }),
      buildInquiry({ id: "fresh", createdAt: "2026-06-09T12:00:00.000Z" }),
    ];

    const result = filterInquiries(
      target,
      { ...EMPTY_INQUIRY_FILTERS, aging: "over72h" },
      { referenceDate }
    );

    expect(result.map((item) => item.id)).toEqual(["stale"]);
  });

  it("receivedOnで受付日（日本時間基準）が一致する問い合わせのみ返す", () => {
    const target = [
      buildInquiry({ id: "jst-morning", createdAt: "2026-06-01T23:30:00.000Z" }),
      buildInquiry({ id: "other-day", createdAt: "2026-06-01T10:00:00.000Z" }),
    ];

    const result = filterInquiries(target, {
      ...EMPTY_INQUIRY_FILTERS,
      receivedOn: "2026-06-02",
    });

    expect(result.map((item) => item.id)).toEqual(["jst-morning"]);
  });

  it("unresolvedOnlyとurgencyはAND条件で適用される", () => {
    const target = [
      buildInquiry({ id: "match", status: "new", urgency: "high" }),
      buildInquiry({ id: "wrong-status", status: "resolved", urgency: "high" }),
      buildInquiry({ id: "wrong-urgency", status: "new", urgency: "low" }),
    ];

    const result = filterInquiries(target, {
      ...EMPTY_INQUIRY_FILTERS,
      unresolvedOnly: true,
      urgency: "high",
    });

    expect(result.map((item) => item.id)).toEqual(["match"]);
  });
});

describe("normalizeInquiryFilters", () => {
  it("矛盾がない場合は無変更", () => {
    const filters = { ...EMPTY_INQUIRY_FILTERS, category: "defect" as const };
    expect(normalizeInquiryFilters(filters)).toEqual(filters);
  });

  it("statusをresolvedに変更したとき、unresolvedOnlyが解除される", () => {
    const filters = { ...EMPTY_INQUIRY_FILTERS, unresolvedOnly: true, status: "resolved" as const };
    const result = normalizeInquiryFilters(filters, ["status"]);

    expect(result.status).toBe("resolved");
    expect(result.unresolvedOnly).toBe(false);
  });

  it("unresolvedOnlyをONにしたとき、status=resolvedが解除される", () => {
    const filters = { ...EMPTY_INQUIRY_FILTERS, status: "resolved" as const, unresolvedOnly: true };
    const result = normalizeInquiryFilters(filters, ["unresolvedOnly"]);

    expect(result.status).toBe("");
    expect(result.unresolvedOnly).toBe(true);
  });

  it("agingを選ぶと、unresolvedOnlyが未設定でも自動的にtrueになる", () => {
    const filters = { ...EMPTY_INQUIRY_FILTERS, aging: "over24h" as const };
    const result = normalizeInquiryFilters(filters, ["aging"]);

    expect(result.aging).toBe("over24h");
    expect(result.unresolvedOnly).toBe(true);
  });

  it("urgencyを選ぶと、unresolvedOnlyが未設定でも自動的にtrueになる", () => {
    const filters = { ...EMPTY_INQUIRY_FILTERS, urgency: "high" as const };
    const result = normalizeInquiryFilters(filters, ["urgency"]);

    expect(result.urgency).toBe("high");
    expect(result.unresolvedOnly).toBe(true);
  });

  it("status=resolvedが既にある状態でagingを選ぶと、statusが解除されaging・unresolvedOnlyが有効になる（今回の変更が優先される）", () => {
    const filters = { ...EMPTY_INQUIRY_FILTERS, status: "resolved" as const, aging: "over24h" as const };
    const result = normalizeInquiryFilters(filters, ["aging"]);

    expect(result.status).toBe("");
    expect(result.aging).toBe("over24h");
    expect(result.unresolvedOnly).toBe(true);
  });

  it("agingが有効な状態でstatusをresolvedに変更すると、statusが優先されunresolvedOnly・agingが解除される", () => {
    const filters = { ...EMPTY_INQUIRY_FILTERS, aging: "over24h" as const, unresolvedOnly: true };
    const withStatus = { ...filters, status: "resolved" as const };
    const result = normalizeInquiryFilters(withStatus, ["status"]);

    expect(result.status).toBe("resolved");
    expect(result.unresolvedOnly).toBe(false);
    expect(result.aging).toBe("");
  });

  it("unclaimedOnlyに相当する概念は無いため、urgency・agingが有効な状態でunresolvedOnlyを明示的にOFFにすると両方解除される", () => {
    const filters = {
      ...EMPTY_INQUIRY_FILTERS,
      urgency: "high" as const,
      aging: "over24h" as const,
      unresolvedOnly: true,
    };
    const result = normalizeInquiryFilters(
      { ...filters, unresolvedOnly: false },
      ["unresolvedOnly"]
    );

    expect(result.unresolvedOnly).toBe(false);
    expect(result.urgency).toBe("");
    expect(result.aging).toBe("");
  });

  it("再現シナリオ: aging選択→status=resolved選択→再度同じagingを選択すると詰み状態にならない（StatsPanel経由の複数キーpatchを想定）", () => {
    // 1. agingバーをクリック: {aging:"over24h", unresolvedOnly:true}
    let filters = normalizeInquiryFilters(
      { ...EMPTY_INQUIRY_FILTERS, aging: "over24h", unresolvedOnly: true },
      ["aging", "unresolvedOnly"]
    );
    expect(filters).toEqual({ ...EMPTY_INQUIRY_FILTERS, aging: "over24h", unresolvedOnly: true });

    // 2. 対応状況セレクトでresolvedを選ぶ: {status:"resolved"}（unresolvedOnlyは変更しない）
    filters = normalizeInquiryFilters({ ...filters, status: "resolved" }, ["status"]);
    expect(filters.status).toBe("resolved");
    expect(filters.unresolvedOnly).toBe(false);
    expect(filters.aging).toBe(""); // unresolvedOnlyの前提を欠くため解除される

    // 3. 再度同じagingバー行をクリック: {aging:"over24h", unresolvedOnly:true}
    filters = normalizeInquiryFilters(
      { ...filters, aging: "over24h", unresolvedOnly: true },
      ["aging", "unresolvedOnly"]
    );
    expect(filters.status).toBe(""); // statusは今回変更されていないため解除される
    expect(filters.aging).toBe("over24h");
    expect(filters.unresolvedOnly).toBe(true);
  });
});
