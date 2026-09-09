// 月次資料ギャラリー機能の定数。`monthly-document-gallery`spec所有。

/**
 * `as const`のreadonlyタプルとして定義することで、`z.enum(MONTHLY_MATERIAL_CATEGORIES)`が
 * `MonthlyMaterialCategory`のリテラル型を保持したまま利用でき、呼び出し側でのキャストが不要になる
 * （`DOCUMENT_ALLOWED_MIME_TYPES`と同型のパターン）。
 */
export const MONTHLY_MATERIAL_CATEGORIES = ["salesFloorMeeting", "pop"] as const;

/**
 * 資料の売場（商品部門）カテゴリ。`category`（資料種別・画面）とは並列な第2軸で、
 * 画面内の検索・絞り込みに使う。ヒアリング結果で見直す前提の仮値。
 */
export const MONTHLY_MATERIAL_DEPARTMENTS = [
  "seasonalEvent",
  "storage",
  "kitchen",
  "cleaning",
  "beautyHealth",
  "stationery",
  "interior",
  "craftDiy",
  "food",
  "other",
] as const;

/** 対象年の入力許容範囲（下限）。 */
export const MONTHLY_MATERIAL_MIN_YEAR = 2020;

/** 対象年の入力許容範囲（上限）。 */
export const MONTHLY_MATERIAL_MAX_YEAR = 2100;
