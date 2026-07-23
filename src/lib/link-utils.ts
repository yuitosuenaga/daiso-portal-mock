/**
 * リンク集機能（申請者側一覧・ヘルプデスク側管理一覧）で共用する、
 * 新着判定・キーワード絞り込みのユーティリティ。
 * `document-utils.ts` の `isRecentlyUploaded`/`filterDocuments` と同一方針。
 */

/**
 * 「新着」バッジの判定基準日数。この値のみを変更すれば新着判定の期間を調整できる
 * （マジックナンバーを表示コンポーネント側に散在させないための一元管理）。
 */
export const LINK_NEW_BADGE_DAYS = 7;

/**
 * リンクの登録日（`createdAt`）が基準期間（`LINK_NEW_BADGE_DAYS`日）以内かどうかを判定する。
 * `now`はテスト容易性のため任意で指定でき、省略時は現在時刻を使う。未来日時（負の差分）は`false`を返す。
 */
export function isRecentlyCreated(
  createdAt: string,
  now: Date = new Date()
): boolean {
  const createdDate = new Date(createdAt);
  const diffMs = now.getTime() - createdDate.getTime();

  if (diffMs < 0) {
    return false;
  }

  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= LINK_NEW_BADGE_DAYS;
}

interface FilterableLink {
  title: string;
  url: string;
  description?: string;
}

/**
 * タイトル・説明・URLの部分一致（大文字小文字を区別しない）でリンクを絞り込む。
 * キーワードが空のとき、入力配列をそのまま（順序維持で）返す。
 * `documents`機能の`filterDocuments`はtitle+descriptionのみを対象とするが、
 * リンクはURLも検索対象に含める。管理一覧（`LinkManagementListClient`）からも
 * 構造的に同じ形の配列であれば再利用できるよう、ジェネリックで実装する。
 */
export function filterLinks<T extends FilterableLink>(
  links: T[],
  keyword: string
): T[] {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return links;
  }

  return links.filter((link) => {
    const title = link.title.toLowerCase();
    const description = link.description?.toLowerCase() ?? "";
    const url = link.url.toLowerCase();
    return (
      title.includes(normalizedKeyword) ||
      description.includes(normalizedKeyword) ||
      url.includes(normalizedKeyword)
    );
  });
}
