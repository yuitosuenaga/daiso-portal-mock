// お知らせの確認済み・実施済み状況を追跡するための担当者マスタ・ステータス型（フェーズ1のモック定義）。
// アカウント機能が未実装のため、実際のログインユーザーではなく固定のモック担当者を対象とする。

import type { DocumentCompanyCode } from "@/lib/constants/document-company-options";

/** お知らせの確認・対応状況を追跡する対象となる、販社に紐づく担当者。 */
export interface AnnouncementRecipient {
  id: string;
  companyCode: DocumentCompanyCode;
  companyName: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
  contactName: string;
}

/**
 * お知らせ×担当者の組ごとの確認済み・実施済み・リマインド送信状態。
 * レコードが存在しない組み合わせは「未確認・未実施・リマインド未送信」を意味する
 * （スパースな保持方式。フェーズ1のモック実装の簡略化のため）。
 */
export interface AnnouncementRecipientStatus {
  announcementId: string;
  recipientId: string;
  confirmedAt: string | null;
  completedAt: string | null;
  reminderSentAt: string | null;
}

/** 担当者情報と、あるお知らせに対するステータスを結合したビュー。 */
export interface AnnouncementRecipientStatusView {
  recipientId: string;
  companyCode: DocumentCompanyCode;
  companyName: string;
  country: string;
  contactName: string;
  confirmedAt: string | null;
  completedAt: string | null;
  reminderSentAt: string | null;
}

/** お知らせごとの確認済み・実施済み人数の集計。 */
export interface AnnouncementTrackingSummary {
  totalRecipients: number;
  confirmedCount: number;
  /** 対応要否（`actionRequired`）が偽のお知らせでは`null`。 */
  completedCount: number | null;
}

/**
 * 会社単位に集約した確認済み・実施済み状態。
 * 対象担当者全員が記録済みのときのみ非nullを返す（DB上の実体を持たない読み取り専用の型）。
 */
export interface AnnouncementSelfStatus {
  confirmedAt: string | null;
  completedAt: string | null;
}
