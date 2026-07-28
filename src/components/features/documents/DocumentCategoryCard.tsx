import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export interface DocumentCategoryCardProps {
  /** 選択ロケールで解決済みの大分類名（要件20.4・22.1） */
  name: string;
  /** 自社に公開された公開済みドキュメントの件数（要件20.4） */
  documentCount: number;
  /** 大分類配下のドキュメント一覧へのリンク先（要件20.6） */
  href: string;
  /** `documents.categories.documentCount`で解決済みの件数表示ラベル */
  documentCountLabel: string;
}

/**
 * トップページに並ぶ、クリック可能な大分類カード。ダッシュボードの`NavigationCard`は
 * `icon`/`description`が必須でカテゴリの表示内容と噛み合わないため再利用せず、
 * グリッド・カードのスタイルのみ揃える（design.md参照）。
 */
export function DocumentCategoryCard({
  name,
  documentCount,
  href,
  documentCountLabel,
}: DocumentCategoryCardProps) {
  const accessibleLabel = `${name}. ${documentCountLabel}`;

  return (
    <Link
      href={href}
      aria-label={accessibleLabel}
      className="group block h-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card
        className="h-full transition-colors group-hover:border-primary group-hover:bg-accent"
        data-document-count={documentCount}
      >
        <CardHeader>
          <CardTitle className="text-lg">{name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{documentCountLabel}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
