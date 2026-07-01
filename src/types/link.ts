// リンク集機能のドメイン型定義（フェーズ1の仮定義）。
// category の選択肢はヘルプデスク担当者へのヒアリング後に変更される前提。

/** リンクの種別（category）。ヒアリング後に選択肢が変更される前提の仮値。 */
export type LinkCategory = "internal" | "external" | "document" | "other";

export interface Link {
  id: string;
  title: string;
  url: string;
  category: LinkCategory;
  /** 補足説明（フェーズ1は任意項目） */
  description?: string;
}
