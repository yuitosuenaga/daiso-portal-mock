// マニュアル専用画面の定数。`manuals`spec所有。
// ファイルアップロード関連の定数（許容MIMEタイプ・最大サイズ）は`src/lib/constants/document.ts`の
// `DOCUMENT_ALLOWED_MIME_TYPES`/`DOCUMENT_MAX_FILE_SIZE_BYTES`を再利用し、重複定義しない。

/**
 * `as const`のreadonlyタプルとして定義することで、`z.enum(MANUAL_CATEGORIES)`が
 * `ManualCategory`のリテラル型を保持したまま利用でき、呼び出し側でのキャストが不要になる
 * （`MONTHLY_MATERIAL_CATEGORIES`と同型のパターン）。
 */
export const MANUAL_CATEGORIES = [
  "storeOperations",
  "registerPayment",
  "inventoryOrdering",
  "salesFloorDisplay",
  "promotion",
  "safetyHygiene",
  "hrTraining",
  "systemOperation",
  "accounting",
  "other",
] as const;

/** 対象年の入力許容範囲（下限）。`MONTHLY_MATERIAL_MIN_YEAR`と同値。 */
export const MANUAL_MIN_YEAR = 2020;

/** 対象年の入力許容範囲（上限）。`MONTHLY_MATERIAL_MAX_YEAR`と同値。 */
export const MANUAL_MAX_YEAR = 2100;
