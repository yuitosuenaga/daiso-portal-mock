// ヘルプデスク側の対応履歴（フェーズ1の仮定義）。

import type { InquiryAttachment } from "@/types/attachment";

/** 対応履歴イベントの種別。 */
export type InquiryHistoryEntryType =
  | "claimed"
  | "released"
  | "status_changed"
  | "reply_sent";

/**
 * 1件の問い合わせに対する対応履歴イベント。
 */
export type InquiryHistoryEntry = {
  id: string;
  inquiryId: string;
  type: InquiryHistoryEntryType;
  actorName: string;
  /** ISO 8601 形式の発生時刻 */
  occurredAt: string;
  /** 変更前後の値や返信本文の要約など、イベントの補足情報 */
  detail?: string;
  /** 返信（`reply_sent`）に添付されたファイル一覧。他の種別では常に未設定 */
  attachments?: InquiryAttachment[];
};
