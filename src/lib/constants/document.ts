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
