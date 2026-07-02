// FAQ機能の選択肢コード一覧（フェーズ1の仮リスト。表示ラベルは翻訳キー側で管理する）。

import type { Faq } from "@/types/faq";

/** FAQ種別（category）のコード一覧。ヒアリング後に変更される前提の仮値。 */
export const FAQ_CATEGORY_CODES = [
  "inquiry_method",
  "form_input",
  "status",
  "other",
] as const satisfies readonly Faq["category"][];
