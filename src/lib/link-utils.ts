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

interface GroupableLink {
  categoryId: string | null;
  subCategoryId: string | null;
}

export interface LinkCategoryGroupData<T extends GroupableLink> {
  /** 大分類のID。「未分類」グループのみ null */
  categoryId: string | null;
  /** 解決済みの大分類名（「未分類」グループは呼び出し側が用意した固定ラベルを充てる） */
  categoryName: string;
  links: Array<T & { subCategoryName: string | null }>;
}

/**
 * リンクを大分類（`links-management`spec提供の`LinkCategorySummary[]`、`displayOrder`昇順）で
 * グループ化する。`links-page`の申請者側一覧・`links-management`のプレビュー機能
 * （`LinkPreviewPanel`）の両方から呼び出される共通ロジック（表示ロジックの二重実装を避ける）。
 *
 * - 大分類は`categories`の順序（displayOrder昇順）で走査し、該当リンクが1件以上あるものだけを返す
 * - 各リンクの`subCategoryId`を大分類の`subCategories`から検索し、解決済みの`subCategoryName`を付与する
 * - `categoryId`が`null`のリンクは「未分類」グループとしてまとめ、末尾に追加する（1件以上のときのみ）
 */
export function groupLinksByCategory<T extends GroupableLink>(
  links: T[],
  categories: LinkCategorySummaryLike[],
  uncategorizedLabel: string
): LinkCategoryGroupData<T>[] {
  const groups: LinkCategoryGroupData<T>[] = [];

  for (const category of categories) {
    const categoryLinks = links.filter((link) => link.categoryId === category.id);
    if (categoryLinks.length === 0) {
      continue;
    }

    groups.push({
      categoryId: category.id,
      categoryName: category.name,
      links: categoryLinks.map((link) => ({
        ...link,
        subCategoryName:
          category.subCategories.find((sub) => sub.id === link.subCategoryId)?.name ??
          null,
      })),
    });
  }

  const uncategorizedLinks = links.filter((link) => link.categoryId === null);
  if (uncategorizedLinks.length > 0) {
    groups.push({
      categoryId: null,
      categoryName: uncategorizedLabel,
      links: uncategorizedLinks.map((link) => ({ ...link, subCategoryName: null })),
    });
  }

  return groups;
}

interface LinkCategorySummaryLike {
  id: string;
  name: string;
  subCategories: Array<{ id: string; name: string }>;
}
