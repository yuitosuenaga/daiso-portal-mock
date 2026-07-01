import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LinkItem } from "@/components/features/links/LinkItem";
import type { Link, LinkCategory } from "@/types/link";

export interface LinkCategoryGroupProps {
  /** グループ化対象のカテゴリコード */
  category: LinkCategory;
  /** カテゴリの翻訳済み表示ラベル */
  categoryLabel: string;
  /** このカテゴリに属するリンクの一覧（1件以上） */
  links: Link[];
  /** 「新しいタブで開きます」等の、翻訳済みのアクセシブルなテキスト */
  opensInNewTabLabel: string;
}

/**
 * 1カテゴリ分のリンクをカード形式でまとめて表示するコンポーネント。
 * 画面幅に応じて1カラムまたは複数カラムのグリッドでリンク項目を配置する。
 */
export function LinkCategoryGroup({
  category,
  categoryLabel,
  links,
  opensInNewTabLabel,
}: LinkCategoryGroupProps) {
  return (
    <Card data-category={category}>
      <CardHeader>
        <CardTitle className="text-base">{categoryLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {links.map((link) => (
            <LinkItem key={link.id} link={link} opensInNewTabLabel={opensInNewTabLabel} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
