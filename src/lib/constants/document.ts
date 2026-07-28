/**
 * ドキュメント共有機能のファイル検証定数。`documents-management`spec所有。
 */

/** ドキュメント1件（PDF）あたりの最大サイズ（バイト）。20MB。 */
export const DOCUMENT_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/** アップロードを許可するファイル形式（PDFのみ）。 */
export const DOCUMENT_ALLOWED_MIME_TYPES = ["application/pdf"] as const;

/**
 * ヘルプデスク側ドキュメント管理一覧の1ページあたりの表示件数。
 * マジックナンバーの散在を避けるためここで一元管理する。
 */
export const DOCUMENT_MANAGEMENT_PAGE_SIZE = 10;

/** 管理一覧の登録方式（sourceType）による絞り込み選択肢。"all" は絞り込みなしを表す。 */
export const DOCUMENT_MANAGEMENT_SOURCE_TYPE_FILTERS = [
  "all",
  "upload",
  "google",
] as const;

export type DocumentManagementSourceTypeFilter =
  (typeof DOCUMENT_MANAGEMENT_SOURCE_TYPE_FILTERS)[number];

/**
 * 管理一覧の公開範囲種別（targeting.scope）による絞り込み選択肢。
 * "all" は絞り込みなし、"all-scope" は`targeting.scope === "all"`（全体公開）に対応する
 * （`Document`側の`scope: "all"`と本フィルタの`"all"`＝絞り込みなしの意味が異なるため区別する）。
 */
export const DOCUMENT_MANAGEMENT_SCOPE_FILTERS = [
  "all",
  "all-scope",
  "countries",
  "companies",
] as const;

export type DocumentManagementScopeFilter =
  (typeof DOCUMENT_MANAGEMENT_SCOPE_FILTERS)[number];

/** 管理一覧の大分類絞り込みの「すべて」センチネル値。 */
export const DOCUMENT_MANAGEMENT_CATEGORY_FILTER_ALL = "all";
/** 管理一覧の大分類絞り込みの「未設定（カテゴリ未割当）」センチネル値（要件22.1）。 */
export const DOCUMENT_MANAGEMENT_CATEGORY_FILTER_UNASSIGNED = "unassigned";
/** 管理一覧の中分類絞り込みの「すべて」センチネル値。 */
export const DOCUMENT_MANAGEMENT_SUB_CATEGORY_FILTER_ALL = "all";

const CATEGORY_FILTER_ID_PREFIX = "id:";

/**
 * 大分類絞り込みの値表現。センチネル（"all"・"unassigned"）とカテゴリIDを型安全に
 * 区別するため、実際のIDは`id:`プレフィックス付きのテンプレートリテラル型で表す。
 */
export type DocumentManagementCategoryFilter =
  | typeof DOCUMENT_MANAGEMENT_CATEGORY_FILTER_ALL
  | typeof DOCUMENT_MANAGEMENT_CATEGORY_FILTER_UNASSIGNED
  | `${typeof CATEGORY_FILTER_ID_PREFIX}${string}`;

/** 中分類絞り込みの値表現。"all"（絞り込みなし）またはカテゴリID。 */
export type DocumentManagementSubCategoryFilter =
  | typeof DOCUMENT_MANAGEMENT_SUB_CATEGORY_FILTER_ALL
  | `${typeof CATEGORY_FILTER_ID_PREFIX}${string}`;

/** カテゴリIDを絞り込み値表現へ変換する。 */
export function toCategoryFilterValue(
  categoryId: string
): `${typeof CATEGORY_FILTER_ID_PREFIX}${string}` {
  return `${CATEGORY_FILTER_ID_PREFIX}${categoryId}`;
}

/**
 * 絞り込み値表現からカテゴリIDを取り出す。センチネル値（"all"・"unassigned"）の場合は
 * `null`を返す。
 */
export function parseCategoryFilterValue(value: string): string | null {
  return value.startsWith(CATEGORY_FILTER_ID_PREFIX)
    ? value.slice(CATEGORY_FILTER_ID_PREFIX.length)
    : null;
}
