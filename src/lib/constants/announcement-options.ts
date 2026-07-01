// お知らせ・情報共有機能の選択肢コード一覧（フェーズ1の仮リスト。表示ラベルは翻訳キー側で管理する）。

import type { Announcement } from "@/types/announcement";

/** お知らせ種別（category）のコード一覧。ヒアリング後に変更される前提の仮値。 */
export const ANNOUNCEMENT_CATEGORY_CODES = [
  "maintenance",
  "policy",
  "incident",
  "other",
] as const satisfies readonly Announcement["category"][];
