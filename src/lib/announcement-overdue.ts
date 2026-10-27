import { toReferenceDateKey } from "@/lib/reference-date";

/**
 * 対応期限（YYYY-MM-DD）が超過済みかを日付単位（日本時間JST基準）で判定する。
 * dueDateがnull/undefinedのときはfalse。期限日当日は未超過（false）。
 * @param now 判定基準時刻（省略時は new Date()）。テスト容易性のため注入可能にする。
 */
export function isAnnouncementDueDateOverdue(
  dueDate: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!dueDate) {
    return false;
  }

  // dueDate（YYYY-MM-DD）と日本時間（JST）基準の当日キー（YYYY-MM-DD）を文字列比較する。
  // ゼロ埋め固定長のため辞書順＝日付順。実行環境のタイムゾーンに依存しない。
  return dueDate < toReferenceDateKey(now);
}
