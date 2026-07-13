import type { InquiryHistoryEntry } from "@/types/inquiry-history";
import {
  appendHistoryEntry,
  listHistory,
} from "@/lib/server/inquiry-service";

/**
 * 指定された問い合わせの対応履歴を発生時刻の降順で取得する。
 * セッションは要求しない（呼び出し元が自身のコンテキストに応じてアクセス制御を行う）。
 */
export async function getInquiryHistory(
  inquiryId: string
): Promise<InquiryHistoryEntry[]> {
  return listHistory(inquiryId);
}

/**
 * 対応履歴を1件追記する。追記のみで更新・削除は行わない。
 * セッションは要求しない（呼び出し元が自身のコンテキストに応じてアクセス制御を行う）。
 */
export async function appendInquiryHistoryEntry(
  entry: Omit<InquiryHistoryEntry, "id">
): Promise<InquiryHistoryEntry> {
  return appendHistoryEntry(entry);
}
