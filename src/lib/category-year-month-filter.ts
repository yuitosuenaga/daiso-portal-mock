import {
  CATEGORY_YEAR_MONTH_FILTER_ALL,
  type CategoryYearMonthFilters,
} from "@/lib/constants/category-year-month-filter";

export interface SelectOptionLike {
  value: string;
  label: string;
}

/**
 * 1〜12月をロケールに応じた月名ラベルにして返す（`MonthlyMaterialGallery`の
 * `buildMonthOptions`と同じ方針。UTC固定で年月日のズレを避ける）。valueは"1"〜"12"の文字列。
 */
export function buildMonthOptions(locale: string): SelectOptionLike[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC",
  });
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      value: String(month),
      label: formatter.format(new Date(Date.UTC(2000, index, 1))),
    };
  });
}

/**
 * 渡された年の配列を重複排除し降順にソートして選択肢に変換する。
 */
export function buildYearOptions(years: number[]): SelectOptionLike[] {
  const uniqueYears = Array.from(new Set(years));
  uniqueYears.sort((a, b) => b - a);
  return uniqueYears.map((year) => ({
    value: String(year),
    label: String(year),
  }));
}

/**
 * 対象一覧から年の重複排除済み配列を収集する。順序は問わない
 * （`buildYearOptions`に渡す前提のため、そちら側でソートする）。
 */
export function collectYears<T extends { year: number }>(items: T[]): number[] {
  return Array.from(new Set(items.map((item) => item.year)));
}

/**
 * カテゴリ×年月フィルタの条件を対象アイテムが満たすか判定する。各軸の値が
 * `CATEGORY_YEAR_MONTH_FILTER_ALL`（すべて）の場合はその軸のチェックをスキップする。
 * 年・月は数値と文字列の比較を避けるため文字列化して比較する。
 */
export function matchesCategoryYearMonth<T>(
  item: T,
  filters: CategoryYearMonthFilters,
  getCategory: (item: T) => string,
  getYear: (item: T) => number,
  getMonth: (item: T) => number
): boolean {
  if (
    filters.category !== CATEGORY_YEAR_MONTH_FILTER_ALL &&
    getCategory(item) !== filters.category
  ) {
    return false;
  }
  if (
    filters.year !== CATEGORY_YEAR_MONTH_FILTER_ALL &&
    String(getYear(item)) !== filters.year
  ) {
    return false;
  }
  if (
    filters.month !== CATEGORY_YEAR_MONTH_FILTER_ALL &&
    String(getMonth(item)) !== filters.month
  ) {
    return false;
  }
  return true;
}
