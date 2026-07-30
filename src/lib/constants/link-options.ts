// リンク集機能の定数。
// カテゴリ選択肢（大分類・中分類）は固定コードではなくDB管理の`LinkCategory`階層モデルへ
// 2026-07-29に移行した（旧`LINK_CATEGORY_CODES`・`LinkManagementCategoryFilter`は撤去）。
// 大分類・中分類の絞り込み選択肢の型は`@/types/link-category`の`LinkCategoryAdminView`を参照する。

/**
 * ヘルプデスク側リンク集管理一覧の1ページあたりの表示件数。
 * マジックナンバーの散在を避けるためここで一元管理する（`document.ts`の
 * `DOCUMENT_MANAGEMENT_PAGE_SIZE`と同一方針）。
 */
export const LINK_MANAGEMENT_PAGE_SIZE = 10;
