import { describe, expect, it } from "vitest";

import {
  buildMonthOptions,
  buildYearOptions,
  collectYears,
  matchesCategoryYearMonth,
} from "@/lib/category-year-month-filter";
import {
  CATEGORY_YEAR_MONTH_FILTER_ALL,
  type CategoryYearMonthFilters,
} from "@/lib/constants/category-year-month-filter";

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

interface SampleItem {
  category: string;
  year: number;
  month: number;
}

function getCategory(item: SampleItem): string {
  return item.category;
}
function getYear(item: SampleItem): number {
  return item.year;
}
function getMonth(item: SampleItem): number {
  return item.month;
}

describe("collectYears", () => {
  it("year の重複排除済み配列を返す（順序は問わない）", () => {
    const result = collectYears([
      { year: 2026 },
      { year: 2025 },
      { year: 2026 },
    ]);

    expect(new Set(result)).toEqual(new Set([2026, 2025]));
    expect(result).toHaveLength(2);
  });
});

describe("buildYearOptions", () => {
  it("重複する年を除去する", () => {
    const options = buildYearOptions([2026, 2025, 2026, 2024]);

    expect(options).toEqual([
      { value: "2026", label: "2026" },
      { value: "2025", label: "2025" },
      { value: "2024", label: "2024" },
    ]);
  });

  it("年を降順にソートする", () => {
    const options = buildYearOptions([2023, 2026, 2024]);

    expect(options.map((option) => option.value)).toEqual([
      "2026",
      "2024",
      "2023",
    ]);
  });
});

describe("buildMonthOptions", () => {
  it.each(["ja", "en"])(
    "ロケール(%s)で12件のオプションを返し、valueが\"1\"〜\"12\"、labelが空文字でない",
    (locale) => {
      const options = buildMonthOptions(locale);

      expect(options).toHaveLength(12);
      expect(options.map((option) => option.value)).toEqual(
        Array.from({ length: 12 }, (_, index) => String(index + 1))
      );
      for (const option of options) {
        expect(option.label.length).toBeGreaterThan(0);
      }
    }
  );
});

describe("matchesCategoryYearMonth", () => {
  const item: SampleItem = { category: "pop", year: 2026, month: 9 };

  it("カテゴリのみ指定し、一致する場合はtrueを返す", () => {
    const filters = buildFilters({ category: "pop" });

    expect(
      matchesCategoryYearMonth(item, filters, getCategory, getYear, getMonth)
    ).toBe(true);
  });

  it("カテゴリのみ指定し、一致しない場合はfalseを返す", () => {
    const filters = buildFilters({ category: "sales-floor" });

    expect(
      matchesCategoryYearMonth(item, filters, getCategory, getYear, getMonth)
    ).toBe(false);
  });

  it("年のみ指定し、一致する場合はtrueを返す", () => {
    const filters = buildFilters({ year: "2026" });

    expect(
      matchesCategoryYearMonth(item, filters, getCategory, getYear, getMonth)
    ).toBe(true);
  });

  it("年のみ指定し、一致しない場合はfalseを返す", () => {
    const filters = buildFilters({ year: "2025" });

    expect(
      matchesCategoryYearMonth(item, filters, getCategory, getYear, getMonth)
    ).toBe(false);
  });

  it("月のみ指定し、一致する場合はtrueを返す", () => {
    const filters = buildFilters({ month: "9" });

    expect(
      matchesCategoryYearMonth(item, filters, getCategory, getYear, getMonth)
    ).toBe(true);
  });

  it("月のみ指定し、一致しない場合はfalseを返す", () => {
    const filters = buildFilters({ month: "8" });

    expect(
      matchesCategoryYearMonth(item, filters, getCategory, getYear, getMonth)
    ).toBe(false);
  });

  it("複数条件併用時、すべて一致する場合はtrueを返す", () => {
    const filters = buildFilters({ category: "pop", year: "2026", month: "9" });

    expect(
      matchesCategoryYearMonth(item, filters, getCategory, getYear, getMonth)
    ).toBe(true);
  });

  it("複数条件併用時、いずれか一致しない場合はfalseを返す", () => {
    const filters = buildFilters({ category: "pop", year: "2026", month: "8" });

    expect(
      matchesCategoryYearMonth(item, filters, getCategory, getYear, getMonth)
    ).toBe(false);
  });

  it("すべて「all」のとき全件を通過させる", () => {
    const filters = buildFilters();

    expect(
      matchesCategoryYearMonth(item, filters, getCategory, getYear, getMonth)
    ).toBe(true);
  });
});
