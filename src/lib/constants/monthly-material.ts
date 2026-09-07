// 月次資料ギャラリー機能の定数。`monthly-document-gallery`spec所有。

/**
 * `as const`のreadonlyタプルとして定義することで、`z.enum(MONTHLY_MATERIAL_CATEGORIES)`が
 * `MonthlyMaterialCategory`のリテラル型を保持したまま利用でき、呼び出し側でのキャストが不要になる
 * （`DOCUMENT_ALLOWED_MIME_TYPES`と同型のパターン）。
 */
export const MONTHLY_MATERIAL_CATEGORIES = ["salesFloorMeeting", "pop"] as const;

/** 対象年の入力許容範囲（下限）。 */
export const MONTHLY_MATERIAL_MIN_YEAR = 2020;

/** 対象年の入力許容範囲（上限）。 */
export const MONTHLY_MATERIAL_MAX_YEAR = 2100;
