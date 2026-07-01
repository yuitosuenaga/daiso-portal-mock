// リンク集機能の選択肢コード一覧（フェーズ1の仮リスト。表示ラベルは翻訳キー側で管理する）。

import type { Link } from "@/types/link";

/** リンク種別（category）のコード一覧。ヒアリング後に変更される前提の仮値。 */
export const LINK_CATEGORY_CODES = [
  "internal",
  "external",
  "document",
  "other",
] as const satisfies readonly Link["category"][];
