// 問い合わせ・申請フォームのドメイン型定義（フェーズ1の仮定義）。
// category の選択肢はヘルプデスク担当者へのヒアリング後に変更される前提。

/**
 * 問い合わせ・申請1件を表す集約型。
 */
export type Inquiry = {
  id: string;
  category: "defect" | "order" | "system" | "other";
  urgency: "high" | "medium" | "low";
  storeRegion: string;
  /** 自由記述（原文） */
  originalText: string;
  /** ISO 639-1 言語コード（例: "ja", "en"） */
  originalLanguage: string;
  /** 日本語訳。フェーズ3（Amazon Translate連携）まで未使用 */
  translatedText?: string;
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
};

/**
 * 問い合わせ・申請送信時のAPI入力契約。
 * `Inquiry` から `id`（API側で生成）と `translatedText`（フェーズ3まで未使用）を除いたサブセット。
 */
export type CreateInquiryInput = Omit<Inquiry, "id" | "translatedText">;
