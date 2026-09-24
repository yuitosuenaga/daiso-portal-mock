// 問い合わせ・申請フォームのドメイン型定義（フェーズ1の仮定義）。
// category の選択肢はヘルプデスク担当者へのヒアリング後に変更される前提。

import type { InquiryAttachment } from "@/types/attachment";

/**
 * 問い合わせ・申請1件を表す集約型。
 */
export type Inquiry = {
  id: string;
  /** タイトル（件名） */
  title: string;
  category: "defect" | "order" | "system" | "other";
  urgency: "high" | "medium" | "low";
  storeRegion: string;
  /** 自由記述（原文） */
  originalText: string;
  /** ISO 639-1 言語コード（例: "ja", "en"） */
  originalLanguage: string;
  /** @deprecated `translations`（locale="ja"）へ移行。新規書き込みは行わない */
  translatedText?: string;
  /** 原文以外の言語の翻訳（Claude APIによる自動翻訳）。`originalLanguage`と同じlocaleの行は作らない */
  translations?: InquiryTranslation[];
  /** 自動翻訳の状態。`pending`=翻訳対象言語なし/未実行、`completed`=全言語翻訳済み、`failed`=1件以上失敗 */
  translationStatus?: "pending" | "completed" | "failed";
  status: "new" | "in_progress" | "resolved";
  /** ISO 8601 形式の送信時刻 */
  createdAt: string;
  submittedBy: {
    companyName: string;
    /** ISO 3166-1 alpha-2 国コード */
    country: string;
  };
  /**
   * ヘルプデスク側の対応中フラグ。二重対応防止のための自己申告制フラグで、
   * `status` とは独立した概念。対応中でないときは `null`。
   */
  claim?: {
    staffName: string;
    /** ISO 8601 形式の対応開始時刻 */
    claimedAt: string;
  } | null;
  /** 添付ファイル一覧。任意項目で、0件を許可する */
  attachments?: InquiryAttachment[];
};

/** 問い合わせ本文の翻訳1件分（`originalLanguage`以外の言語）。 */
export type InquiryTranslation = {
  locale: string;
  title: string;
  body: string;
  source: "manual" | "machine";
};

/**
 * 問い合わせ・申請送信時のAPI入力契約。
 * `Inquiry` から `id`（API側で生成）・`translatedText`（非推奨）・`translations`・`translationStatus`
 * （いずれもAPI側で書き込む）を除いたサブセット。
 */
export type CreateInquiryInput = Omit<
  Inquiry,
  "id" | "translatedText" | "translations" | "translationStatus"
>;
