import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LinkItem } from "@/components/features/links/LinkItem";
import type { LinkWithTimestamp } from "@/types/link";

export interface LinkCategoryGroupProps {
  /** グループ化対象の大分類ID（未分類グループのときは"uncategorized"等の固定値） */
  category: string;
  /** カテゴリの翻訳済み表示ラベル（`links-management`spec提供の`resolveLinkCategoryContent`で解決済み） */
  categoryLabel: string;
  /** このカテゴリに属するリンクの一覧（1件以上）。中分類名は`groupLinksByCategory`で解決済み */
  links: Array<LinkWithTimestamp & { subCategoryName?: string | null }>;
  /** 日付表示に使用するロケール */
  locale: string;
  /** 「新しいタブで開きます」等の、翻訳済みのアクセシブルなテキスト */
  opensInNewTabLabel: string;
  /** 「新着」バッジの翻訳済みラベル */
  newBadgeLabel: string;
}

/**
 * 1カテゴリ分のリンクをカード形式でまとめて表示するコンポーネント。
 * 画面幅に応じて1カラムまたは複数カラムのグリッドでリンク項目を配置する。
 */
export function LinkCategoryGroup({
  category,
  categoryLabel,
  links,
  locale,
  opensInNewTabLabel,
  newBadgeLabel,
}: LinkCategoryGroupProps) {
  return (
    <Card data-category={category}>
      <CardHeader>
        <CardTitle className="text-base">{categoryLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {links.map((link) => (
            <LinkItem
              key={link.id}
              link={link}
              locale={locale}
              opensInNewTabLabel={opensInNewTabLabel}
              newBadgeLabel={newBadgeLabel}
              subCategoryName={link.subCategoryName}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
