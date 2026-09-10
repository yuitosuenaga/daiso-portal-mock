import { describe, expect, it } from "vitest";

import {
  countByCategory,
  countUnresolvedAging,
  countUnresolvedByCountry,
  findOldestUnresolvedHours,
  toAgingBarRows,
  toCategoryBarRows,
  toCountryBarRows,
  withSharedBarScale,
} from "@/lib/inquiry-breakdown";
import type { Inquiry } from "@/types/inquiry";

function buildInquiry(overrides: Partial<Inquiry> & { id: string }): Inquiry {
  return {
    title: "テストタイトル",
    category: "other",
    urgency: "medium",
    storeRegion: "Tokyo",
    originalText: "テスト本文",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-07-01T00:00:00.000Z",
    submittedBy: { companyName: "Test Co.", country: "JP" },
    claim: null,
    ...overrides,
  };
}

const referenceDate = new Date("2026-07-23T00:00:00.000Z");

describe("countByCategory", () => {
  it("0件のカテゴリも0で埋めて返す", () => {
    const result = countByCategory([buildInquiry({ id: "1", category: "defect" })]);
    expect(result).toEqual({ defect: 1, order: 0, system: 0, other: 0 });
  });
});

describe("countUnresolvedByCountry", () => {
  it("未解決のみを母集団に、count降順→country昇順で返す", () => {
    const inquiries = [
      buildInquiry({ id: "1", status: "new", submittedBy: { companyName: "A", country: "TH" } }),
      buildInquiry({ id: "2", status: "resolved", submittedBy: { companyName: "B", country: "TH" } }),
      buildInquiry({ id: "3", status: "in_progress", submittedBy: { companyName: "C", country: "VN" } }),
      buildInquiry({ id: "4", status: "new", submittedBy: { companyName: "D", country: "VN" } }),
    ];

    const result = countUnresolvedByCountry(inquiries);

    expect(result).toEqual([
      { country: "VN", count: 2 },
      { country: "TH", count: 1 },
    ]);
  });

  it("同数はcountry昇順", () => {
    const inquiries = [
      buildInquiry({ id: "1", status: "new", submittedBy: { companyName: "A", country: "VN" } }),
      buildInquiry({ id: "2", status: "new", submittedBy: { companyName: "B", country: "TH" } }),
    ];

    const result = countUnresolvedByCountry(inquiries);

    expect(result.map((r) => r.country)).toEqual(["TH", "VN"]);
  });
});

describe("countUnresolvedAging", () => {
  it("未解決のみを母集団にバケット別集計する。resolvedは含めない", () => {
    const inquiries = [
      buildInquiry({ id: "1", status: "new", createdAt: referenceDate.toISOString() }), // lt24h
      buildInquiry({
        id: "2",
        status: "resolved",
        createdAt: new Date(referenceDate.getTime() - 200 * 3_600_000).toISOString(),
      }),
    ];

    const result = countUnresolvedAging(inquiries, referenceDate);

    expect(result).toEqual({ lt24h: 1, h24to72: 0, d3to7: 0, gte7d: 0 });
  });
});

describe("findOldestUnresolvedHours", () => {
  it("未解決が0件ならnull", () => {
    expect(findOldestUnresolvedHours([], referenceDate)).toBeNull();
  });

  it("未解決のうち最古の経過時間を返す", () => {
    const inquiries = [
      buildInquiry({
        id: "1",
        status: "new",
        createdAt: new Date(referenceDate.getTime() - 10 * 3_600_000).toISOString(),
      }),
      buildInquiry({
        id: "2",
        status: "in_progress",
        createdAt: new Date(referenceDate.getTime() - 50 * 3_600_000).toISOString(),
      }),
    ];

    expect(findOldestUnresolvedHours(inquiries, referenceDate)).toBeCloseTo(50);
  });
});

describe("withSharedBarScale", () => {
  it("count最大値を100%とする", () => {
    const rows = withSharedBarScale([
      { key: "a", label: "A", count: 1 },
      { key: "b", label: "B", count: 4 },
    ]);
    expect(rows.map((r) => r.barPercent)).toEqual([25, 100]);
  });

  it("全件0のときは全行0%（0除算しない）", () => {
    const rows = withSharedBarScale([{ key: "a", label: "A", count: 0 }]);
    expect(rows[0].barPercent).toBe(0);
  });
});

describe("toCategoryBarRows", () => {
  it("固定順・固定ラベルで行を返す", () => {
    const rows = toCategoryBarRows(
      { defect: 2, order: 1, system: 0, other: 0 },
      { defect: "不良品", order: "発注", system: "システム", other: "その他" }
    );
    expect(rows.map((r) => r.key)).toEqual(["defect", "order", "system", "other"]);
    expect(rows.map((r) => r.label)).toEqual(["不良品", "発注", "システム", "その他"]);
  });
});

describe("toAgingBarRows", () => {
  it("4バケット固定順で返す", () => {
    const rows = toAgingBarRows(
      { lt24h: 1, h24to72: 0, d3to7: 0, gte7d: 2 },
      { lt24h: "24時間以内", h24to72: "24-72時間", d3to7: "3-7日", gte7d: "7日以上" }
    );
    expect(rows.map((r) => r.key)).toEqual(["lt24h", "h24to72", "d3to7", "gte7d"]);
  });
});

describe("toCountryBarRows", () => {
  it("上位maxRows件＋othersに畳む", () => {
    const byCountry = [
      { country: "TH", count: 5 },
      { country: "VN", count: 4 },
      { country: "PH", count: 3 },
      { country: "MY", count: 2 },
      { country: "SG", count: 1 },
      { country: "ID", count: 1 },
    ];

    const rows = toCountryBarRows(byCountry, {}, { maxRows: 5 });

    expect(rows.filter((r) => r.key !== "others")).toHaveLength(5);
    const others = rows.find((r) => r.key === "others");
    expect(others).toMatchObject({ label: null, count: 1 });
  });

  it("countryLabelsが無い場合はcountryコードをそのままラベルにする", () => {
    const rows = toCountryBarRows([{ country: "TH", count: 1 }], {});
    expect(rows[0].label).toBe("TH");
  });
});
