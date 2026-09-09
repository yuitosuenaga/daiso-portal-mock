import { describe, expect, it } from "vitest";

import {
  CATEGORY_YEAR_MONTH_FILTER_ALL,
  type CategoryYearMonthFilters,
} from "@/lib/constants/category-year-month-filter";
import {
  buildMonthOptions,
  filterMonthlyMaterials,
  formatHeading,
  gridColumnsClassName,
  groupMaterialsByYearMonth,
} from "@/lib/monthly-material-utils";
import type { MonthlyMaterial } from "@/types/monthly-material";

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function material(overrides: Partial<MonthlyMaterial> = {}): MonthlyMaterial {
  return {
    id: "monthly-material-1",
    category: "salesFloorMeeting",
    department: "seasonalEvent",
    year: 2026,
    month: 9,
    sourceType: "upload",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  } as MonthlyMaterial;
}

function buildFilters(
  overrides: Partial<CategoryYearMonthFilters> = {}
): CategoryYearMonthFilters {
  return {
    keyword: "",
    category: CATEGORY_YEAR_MONTH_FILTER_ALL,
    year: CATEGORY_YEAR_MONTH_FILTER_ALL,
    month: CATEGORY_YEAR_MONTH_FILTER_ALL,
    ...overrides,
  };
}

describe("filterMonthlyMaterials", () => {
  const materials = [
    material({ id: "1", department: "kitchen", year: 2026, month: 9 }),
    material({ id: "2", department: "food", year: 2026, month: 8 }),
    material({ id: "3", department: "kitchen", year: 2025, month: 9 }),
  ];

  it("カテゴリ（department）で絞り込む", () => {
    const result = filterMonthlyMaterials(materials, buildFilters({ category: "kitchen" }));

    expect(result.map((item) => item.id)).toEqual(["1", "3"]);
  });

  it("年で絞り込む", () => {
    const result = filterMonthlyMaterials(materials, buildFilters({ year: "2026" }));

    expect(result.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("月で絞り込む", () => {
    const result = filterMonthlyMaterials(materials, buildFilters({ month: "9" }));

    expect(result.map((item) => item.id)).toEqual(["1", "3"]);
  });

  it("カテゴリ・年・月を併用して絞り込む", () => {
    const result = filterMonthlyMaterials(
      materials,
      buildFilters({ category: "kitchen", year: "2026", month: "9" })
    );

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("条件がすべて「all」の場合は全件を返す", () => {
    const result = filterMonthlyMaterials(materials, buildFilters());

    expect(result).toHaveLength(3);
  });

  it("一致する資料が無い場合は空配列を返す", () => {
    const result = filterMonthlyMaterials(materials, buildFilters({ category: "storage" }));

    expect(result).toEqual([]);
  });
});

describe("formatHeading", () => {
  it("年月をロケールに応じた見出し文字列に変換する", () => {
    expect(formatHeading("ja", 2026, 9)).toBe("2026年9月");
  });
});

describe("groupMaterialsByYearMonth", () => {
  it("同一年月のレコードを1つのグループにまとめる", () => {
    const groups = groupMaterialsByYearMonth(
      [
        material({ id: "1", year: 2026, month: 9 }),
        material({ id: "2", year: 2026, month: 9 }),
        material({ id: "3", year: 2026, month: 8 }),
      ],
      "ja"
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ year: 2026, month: 9, heading: "2026年9月" });
    expect(groups[0].items.map((item) => item.id)).toEqual(["1", "2"]);
    expect(groups[1]).toMatchObject({ year: 2026, month: 8, heading: "2026年8月" });
  });

  it("空配列を渡した場合は空配列を返す", () => {
    expect(groupMaterialsByYearMonth([], "ja")).toEqual([]);
  });
});

describe("gridColumnsClassName", () => {
  it("1件の場合は1列にする", () => {
    expect(gridColumnsClassName(1)).toBe("grid-cols-1");
  });

  it("2件の場合は2列にする", () => {
    expect(gridColumnsClassName(2)).toContain("sm:grid-cols-2");
  });

  it("3件以上の場合は3列で折り返す", () => {
    expect(gridColumnsClassName(5)).toContain("lg:grid-cols-3");
  });
});

describe("buildMonthOptions", () => {
  it.each(["ja", "en"])("ロケール(%s)で12件のオプションを返す", (locale) => {
    const options = buildMonthOptions(locale);

    expect(options).toHaveLength(12);
    expect(options.map((option) => option.value)).toEqual(
      Array.from({ length: 12 }, (_, index) => String(index + 1))
    );
  });
});
