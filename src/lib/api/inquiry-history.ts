import type { InquiryHistoryEntry } from "@/types/inquiry-history";
import { getGlobalMockStore } from "@/lib/mock-store";

/**
 * 対応履歴の可変ストア（フェーズ1限定、プロセス内メモリのみ）。
 * `appendInquiryHistoryEntry` で追記し、`getInquiryHistory` で問い合わせ単位に取得する。
 * Server Actionsからの変更がRSCレンダリングに反映されるよう、`globalThis`上に保持する
 * （`lib/mock-store.ts`参照）。
 */
const MOCK_INQUIRY_HISTORY: InquiryHistoryEntry[] = getGlobalMockStore(
  "inquiry-history",
  () => []
);

/**
 * 指定された問い合わせの対応履歴を発生時刻（`occurredAt`）の降順で取得するモックAPI関数。
 */
export async function getInquiryHistory(
  inquiryId: string
): Promise<InquiryHistoryEntry[]> {
  // `occurredAt`はミリ秒単位のため、短時間に連続して記録された複数イベントが
  // 同一時刻になり得る。その場合は挿入順（配列インデックス）を降順の tie-break とする。
  const entries = MOCK_INQUIRY_HISTORY.map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.inquiryId === inquiryId)
    .sort((a, b) => {
      const timeDiff =
        new Date(b.entry.occurredAt).getTime() -
        new Date(a.entry.occurredAt).getTime();
      return timeDiff !== 0 ? timeDiff : b.index - a.index;
    })
    .map(({ entry }) => entry);

  return Promise.resolve(entries);
}

/**
 * 対応履歴を1件追記するモックAPI関数。追記のみで更新・削除は行わない。
 */
export async function appendInquiryHistoryEntry(
  entry: Omit<InquiryHistoryEntry, "id">
): Promise<InquiryHistoryEntry> {
  const newEntry: InquiryHistoryEntry = {
    id: crypto.randomUUID(),
    ...entry,
  };

  MOCK_INQUIRY_HISTORY.push(newEntry);

  return Promise.resolve(newEntry);
}
