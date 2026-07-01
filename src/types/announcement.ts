// お知らせ・情報共有機能のドメイン型定義（フェーズ1の仮定義）。
// category の選択肢はヘルプデスク担当者へのヒアリング後に変更される前提。

/** お知らせの種別（category）。ヒアリング後に選択肢が変更される前提の仮値。 */
export type AnnouncementCategory = "maintenance" | "policy" | "incident" | "other";

export interface Announcement {
  id: string;
  title: string;
  publishedAt: string; // ISO 8601 形式
  category: AnnouncementCategory;
  /** 本文（フェーズ1はプレーンテキスト） */
  body: string;
}
