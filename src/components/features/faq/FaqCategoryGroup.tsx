import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FaqAccordion } from "@/components/features/faq/FaqAccordion";
import type { Faq, FaqCategory } from "@/types/faq";

export interface FaqCategoryGroupProps {
  /** グループ化対象のカテゴリコード */
  category: FaqCategory;
  /** カテゴリの翻訳済み表示ラベル */
  categoryLabel: string;
  /** このカテゴリに属する質問の一覧（1件以上） */
  faqs: Faq[];
}

/**
 * 1カテゴリ分のFAQをカード形式でまとめて表示するコンポーネント。
 * カテゴリ見出しの下に`FaqAccordion`を配置し、質問クリックによる
 * 回答の表示/非表示切り替えを委譲する（要件2.2, 2.3）。
 */
export function FaqCategoryGroup({
  category,
  categoryLabel,
  faqs,
}: FaqCategoryGroupProps) {
  return (
    <Card data-category={category}>
      <CardHeader>
        <CardTitle className="text-base">{categoryLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <FaqAccordion faqs={faqs} />
      </CardContent>
    </Card>
  );
}
