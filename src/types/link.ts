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

/**
 * リンク新規作成・編集時のAPI入力契約。
 * `Link`から`id`（API側で生成）を除いたサブセット。
 */
export type CreateLinkInput = Omit<Link, "id">;

/**
 * 登録日（`createdAt`）を含む表示用のリンク型。
 * 申請者側一覧（新着バッジ・登録日表示）・ヘルプデスク側管理一覧の両方で使用する。
 * `Link`基底型は変更せず、表示専用にこの型を追加する。
 */
export interface LinkWithTimestamp extends Link {
  /** 登録日時（ISO文字列） */
  createdAt: string;
}
