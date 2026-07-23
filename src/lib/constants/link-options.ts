// リンク集機能の選択肢コード一覧（フェーズ1の仮リスト。表示ラベルは翻訳キー側で管理する）。

import type { Link } from "@/types/link";

/** リンク種別（category）のコード一覧。ヒアリング後に変更される前提の仮値。 */
export const LINK_CATEGORY_CODES = [
  "internal",
  "external",
  "document",
  "other",
] as const satisfies readonly Link["category"][];

/**
 * ヘルプデスク側リンク集管理一覧の1ページあたりの表示件数。
 * マジックナンバーの散在を避けるためここで一元管理する（`document.ts`の
 * `DOCUMENT_MANAGEMENT_PAGE_SIZE`と同一方針）。
 */
export const LINK_MANAGEMENT_PAGE_SIZE = 10;

/** 管理一覧のカテゴリ絞り込み選択肢。"all" は絞り込みなしを表す。 */
export type LinkManagementCategoryFilter = Link["category"] | "all";
