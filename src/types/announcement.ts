// お知らせ・情報共有機能のドメイン型定義（フェーズ1の仮定義）。
// category の選択肢はヘルプデスク担当者へのヒアリング後に変更される前提。

import type { InquiryAttachment } from "@/types/attachment";

/** お知らせの種別（category）。ヒアリング後に選択肢が変更される前提の仮値。 */
export type AnnouncementCategory = "maintenance" | "policy" | "incident" | "other";

/**
 * お知らせに直接アップロードする添付ファイル。`inquiry-form`spec所有の`InquiryAttachment`と
 * 同一形状（Base64データURL方式）のため型エイリアスとして再利用する。
 */
export type AnnouncementAttachment = InquiryAttachment;

/** お知らせの公開状態。下書き中は海外販社側に一切表示されない。 */
export type AnnouncementStatus = "draft" | "published";

/**
 * `ja`（既定言語）以外の言語のタイトル・本文。`en`は必須、それ以外は任意で
 * 0件以上登録できる。`locale`はISO言語コード（例: `en`・`th`・`vi`）。
 */
export interface AnnouncementTranslationView {
  locale: string;
  title: string;
  body: string;
}

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
  /** 公開状態。下書き中は`publishedAt`が`null`となり、海外販社側には表示されない。 */
  status: AnnouncementStatus;
  /** 公開日時（ISO 8601形式）。下書き中は`null`。下書き→公開へ遷移した時点で記録される。 */
  publishedAt: string | null;
  category: AnnouncementCategory;
  /** 本文（フェーズ1はプレーンテキスト） */
  body: string;
  targeting: AnnouncementTargeting;
  /** 販社担当者側の対応要否。真のとき「対応が必要」バッジを表示する。 */
  actionRequired: boolean;
  /** 公開期間の開始日（ISO日付 YYYY-MM-DD）。未設定の場合は開始日による制限なし。 */
  publishStartDate?: string | null;
  /** 公開期間の終了日（ISO日付 YYYY-MM-DD）。未設定の場合は終了日による制限なし（開始日・終了日ともに未設定なら常時公開）。 */
  publishEndDate?: string | null;
  /** 対応期限（ISO日付 YYYY-MM-DD）。actionRequiredが真の場合のみ設定される。 */
  dueDate?: string | null;
  /** 作成日時（ISO 8601形式）。ヘルプデスク側一覧の並び順に使用する。 */
  createdAt: string;
  /** 更新日時（ISO 8601形式）。 */
  updatedAt: string;
  /** 直接アップロードされた添付ファイル（最大5件）。 */
  attachments: AnnouncementAttachment[];
  /** `documents-management`spec配下に登録済みのドキュメントへの参照ID（最大5件）。 */
  linkedDocumentIds: string[];
  /**
   * `ja`（既定言語）以外の言語のタイトル・本文。`en`の行は作成・編集時に必ず1件
   * 存在する（サービス層で保証）。`resolveAnnouncementContent`で言語別コンテンツを
   * 解決する際の参照元となる。
   */
  translations: AnnouncementTranslationView[];
}

/**
 * お知らせ作成・編集時のAPI入力契約。
 * `Announcement` から `id`・`publishedAt`（保存時刻から採番）・`createdAt`・`updatedAt`（DB側で管理）を除いたサブセット。
 */
export type CreateAnnouncementInput = Omit<
  Announcement,
  "id" | "publishedAt" | "createdAt" | "updatedAt"
>;
