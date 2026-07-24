/**
 * 対応期限（YYYY-MM-DD）が超過済みかを日付単位で判定する。
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

  const [year, month, day] = dueDate.split("-").map(Number);
  const due = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return due < today;
}
