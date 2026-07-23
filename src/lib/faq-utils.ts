import type { Faq } from "@/types/faq";

/**
 * 「新着」バッジの判定基準日数。この値のみを変更すれば新着判定の期間を調整できる
 * （`document-utils.ts`の`DOCUMENT_NEW_BADGE_DAYS`と同一の考え方を踏襲する）。
 */
export const FAQ_NEW_BADGE_DAYS = 7;

/**
 * FAQの更新日（`updatedAt`）が基準期間（`FAQ_NEW_BADGE_DAYS`日）以内かどうかを判定する。
 * `now`はテスト容易性のため任意で指定でき、省略時は現在時刻を使う。未来日は`false`を返す。
 */
export function isRecentlyUpdated(
  updatedAt: string,
  now: Date = new Date()
): boolean {
  const updatedDate = new Date(updatedAt);
  const diffMs = now.getTime() - updatedDate.getTime();

  if (diffMs < 0) {
    return false;
  }

  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= FAQ_NEW_BADGE_DAYS;
}

/**
 * 質問文・回答文の部分一致（大文字小文字を区別しない）でFAQを絞り込む。
 * キーワードが空のとき、入力配列をそのまま（順序維持で）返す
 * （`document-utils.ts`の`filterDocuments`と同一の設計方針）。
 */
export function filterFaqs(faqs: Faq[], keyword: string): Faq[] {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return faqs;
  }

  return faqs.filter((faq) => {
    const question = faq.question.toLowerCase();
    const answer = faq.answer.toLowerCase();
    return (
      question.includes(normalizedKeyword) || answer.includes(normalizedKeyword)
    );
  });
}
