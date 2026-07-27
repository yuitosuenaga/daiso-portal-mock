// お知らせの確認済み（既読・個人単位）・実施済み（対応完了・会社単位）状況を追跡するための型。
// 確認済みは`ApplicantUser`（実アカウント）単位、実施済みは会社単位マスタ（`AnnouncementRecipient`、
// 会社ごとの代表1件の担当者マスタ）単位という異なる粒度で設計されている
// （2026-07-27 追記: `announcements-management`spec 要件39〜42、個人単位化）。

import type { DocumentCompanyCode } from "@/lib/constants/document-company-options";

/** お知らせの実施済み（対応完了）・完了督促を追跡する対象となる、販社に紐づく会社単位の代表担当者。 */
export interface AnnouncementRecipient {
  id: string;
  companyCode: DocumentCompanyCode;
  companyName: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
  contactName: string;
}

/**
 * お知らせ×会社単位代表担当者の組ごとの実施済み・完了督促の状態（会社単位）。
 * レコードが存在しない組み合わせは「未実施・完了督促未送信」を意味する
 * （スパースな保持方式。フェーズ1のモック実装の簡略化のため）。
 * 確認済み（既読）は本型ではなく`AnnouncementUserReadStatusView`（個人単位）で扱う。
 */
export interface AnnouncementRecipientStatus {
  announcementId: string;
  recipientId: string;
  completedAt: string | null;
  reminderSentAt: string | null;
}

/**
 * 会社単位代表担当者情報と、あるお知らせに対する実施済み・完了督促の状態を結合したビュー。
 * 実施済み（対応完了）・完了督促・自動エスカレーション専用の会社単位ビュー
 * （確認済みは`AnnouncementUserReadStatusView`が担う。要件40.5）。
 */
export interface AnnouncementRecipientStatusView {
  recipientId: string;
  companyCode: DocumentCompanyCode;
  companyName: string;
  country: string;
  contactName: string;
  completedAt: string | null;
  reminderSentAt: string | null;
}

/**
 * お知らせの確認済みトラッキング対象母集団（配信対象の国に属し`isActive: true`の
 * `ApplicantUser`）1名分の、個人単位の受信レシートと結合したビュー（要件39.4）。
 * 確認済みバッジ・未確認ダイアログ・個人宛既読リマインドが使用する。
 */
export interface AnnouncementUserReadStatusView {
  applicantUserId: string;
  displayName: string;
  email: string;
  companyCode: DocumentCompanyCode;
  companyName: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
  confirmedAt: string | null;
  readReminderSentAt: string | null;
}

/**
 * お知らせごとの確認済み（人数ベース）・実施済み（会社ベース）人数の集計。
 * 単位・分母が異なるため、確認済みは対象`ApplicantUser`数、実施済みは対象会社数を分母とする
 * （要件39.2, 40.2）。
 */
export interface AnnouncementTrackingSummary {
  /** 確認済みトラッキング対象母集団の`ApplicantUser`数（分母）。 */
  totalRecipientUsers: number;
  /** 確認済み（既読）の`ApplicantUser`数。 */
  confirmedCount: number;
  /** 実施済みトラッキング対象の会社数（分母）。 */
  totalCompanies: number;
  /** 実施済み（対応完了）の会社数。対応要否（`actionRequired`）が偽のお知らせでは`null`。 */
  completedCount: number | null;
}

/**
 * 申請者本人・所属会社に集約した確認済み・実施済み状態。
 * `confirmedAt`は本人（`ApplicantUser`）の既読、`completedAt`は所属会社の対応完了状態を表す
 * （DB上の実体を持たない読み取り専用の合成型。要件18.3）。
 */
export interface AnnouncementSelfStatus {
  confirmedAt: string | null;
  completedAt: string | null;
}
