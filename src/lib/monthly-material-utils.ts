import { matchesCategoryYearMonth } from "@/lib/category-year-month-filter";
import type { CategoryYearMonthFilters } from "@/lib/constants/category-year-month-filter";
import type { SelectOption } from "@/components/ui/select";
import type { MonthlyMaterial } from "@/types/monthly-material";

/**
 * 資料の売場（商品部門）カテゴリ×年月フィルタ条件を満たす資料のみを返す。
 * カテゴリ軸の比較には`department`を使う（`category`＝資料種別・画面はルート単位で
 * 既に絞り込み済みのため、本フィルタの対象外）。
 */
export function filterMonthlyMaterials(
  materials: MonthlyMaterial[],
  filters: CategoryYearMonthFilters
): MonthlyMaterial[] {
  return materials.filter((material) =>
    matchesCategoryYearMonth(
      material,
      filters,
      (item) => item.department,
      (item) => item.year,
      (item) => item.month
    )
  );
}

/** `year`/`month`から見出し（例:「2026年9月」）をロケールに応じて生成する。 */
export function formatHeading(locale: string, year: number, month: number): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export interface MonthlyMaterialGroup {
  year: number;
  month: number;
  heading: string;
  items: MonthlyMaterial[];
}

/**
 * 年月ごとにグルーピングする。`materials`は`year desc, month desc`（同一年月内は`createdAt asc`）
 * で既に取得済みのため、同一年月のレコードは必ず連続している前提で先頭から素直にまとめられる。
 * フィルタ後の配列に対して呼び出す場合も、フィルタで並び順が変わらないためこの前提は保たれる。
 */
export function groupMaterialsByYearMonth(
  materials: MonthlyMaterial[],
  locale: string
): MonthlyMaterialGroup[] {
  const groups: MonthlyMaterialGroup[] = [];
  for (const material of materials) {
    const currentGroup = groups.at(-1);
    if (currentGroup && currentGroup.year === material.year && currentGroup.month === material.month) {
      currentGroup.items.push(material);
    } else {
      groups.push({
        year: material.year,
        month: material.month,
        heading: formatHeading(locale, material.year, material.month),
        items: [material],
      });
    }
  }
  return groups;
}

const MAX_GRID_COLUMNS = 3;

/**
 * 同一年月内の資料件数に応じたグリッド列数のTailwindクラスを返す。件数が多い場合も
 * `MAX_GRID_COLUMNS`列で折り返す（Tailwindのクラス名検出はビルド時の静的解析のため、
 * 動的な文字列結合ではなく完全なクラス名リテラルをここに列挙しておく必要がある）。
 */
export function gridColumnsClassName(itemCount: number): string {
  const columns = Math.min(itemCount, MAX_GRID_COLUMNS);
  switch (columns) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-1 sm:grid-cols-2";
    default:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  }
}

/**
 * 資料登録フォームの月セレクト用の選択肢（1〜12月、ロケールに応じた月名ラベル）を生成する。
 * UTC固定で年月日のズレを避ける。
 */
export function buildMonthOptions(locale: string): SelectOption[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return { value: String(month), label: formatter.format(new Date(Date.UTC(2000, index, 1))) };
  });
}
