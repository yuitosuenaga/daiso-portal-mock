import type { FaqCategory } from "@/types/faq";

/**
 * ヘルプデスク側FAQ管理一覧の1ページあたりの表示件数。
 * マジックナンバーの散在を避けるためここで一元管理する
 * （`document.ts`の`DOCUMENT_MANAGEMENT_PAGE_SIZE`を踏襲）。
 */
export const FAQ_MANAGEMENT_PAGE_SIZE = 10;

/** 管理一覧のカテゴリ絞り込み選択肢。"all" は絞り込みなしを表す。 */
export type FaqManagementCategoryFilter = "all" | FaqCategory;
