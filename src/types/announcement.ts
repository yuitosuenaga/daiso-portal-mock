// お知らせ・情報共有機能のドメイン型定義（フェーズ1の仮定義）。
// category の選択肢はヘルプデスク担当者へのヒアリング後に変更される前提。

/** お知らせの種別（category）。ヒアリング後に選択肢が変更される前提の仮値。 */
export type AnnouncementCategory = "maintenance" | "policy" | "incident" | "other";

/**
 * お知らせの配信対象。全体一律、または特定の国・地域（ISO 3166-1 alpha-2）を
 * 1件以上指定するかを判別可能なユニオン型で表す。
 */
export type AnnouncementTargeting =
  | { scope: "all" }
  | { scope: "countries"; countries: string[] };

export interface Announcement {
  id: string;
  title: string;
  publishedAt: string; // ISO 8601 形式
  category: AnnouncementCategory;
  /** 本文（フェーズ1はプレーンテキスト） */
  body: string;
  targeting: AnnouncementTargeting;
}

/**
 * お知らせ作成・編集時のAPI入力契約。
 * `Announcement` から `id`（API側で生成）と `publishedAt`（保存時刻を採番）を除いたサブセット。
 */
export type CreateAnnouncementInput = Omit<Announcement, "id" | "publishedAt">;
