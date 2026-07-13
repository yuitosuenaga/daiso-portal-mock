import { describe, expect, it } from "vitest";

import {
  EMPTY_HELPDESK_INQUIRY_FILTERS,
  filterInquiriesForHelpdesk,
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
  it("緊急度（高→中→低）を最優先の基準として並び替える", () => {
    const inquiries = [
      buildInquiry({ id: "low", urgency: "low", createdAt: "2026-06-03T00:00:00.000Z" }),
      buildInquiry({ id: "high", urgency: "high", createdAt: "2026-06-01T00:00:00.000Z" }),
      buildInquiry({ id: "medium", urgency: "medium", createdAt: "2026-06-02T00:00:00.000Z" }),
    ];

    const result = sortInquiriesForHelpdesk(inquiries);

    expect(result.map((item) => item.id)).toEqual(["high", "medium", "low"]);
  });

  it("同一緊急度内では受付日時（createdAt）の降順で並び替える", () => {
    const inquiries = [
      buildInquiry({ id: "older", urgency: "high", createdAt: "2026-06-01T00:00:00.000Z" }),
      buildInquiry({ id: "newer", urgency: "high", createdAt: "2026-06-05T00:00:00.000Z" }),
    ];

    const result = sortInquiriesForHelpdesk(inquiries);

    expect(result.map((item) => item.id)).toEqual(["newer", "older"]);
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
      submittedBy: { companyName: "Daiso Vietnam Co., Ltd.", country: "VN" },
      originalText: "商品が破損しています。",
    }),
    buildInquiry({
      id: "2",
      category: "order",
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
});
