"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { filterFaqs } from "@/lib/faq-utils";
import { FAQ_CATEGORY_CODES } from "@/lib/constants/faq-options";
import { FaqSearchBar } from "@/components/features/faq/FaqSearchBar";
import { FaqCategoryGroup } from "@/components/features/faq/FaqCategoryGroup";
import type { Faq, FaqCategory } from "@/types/faq";

export interface FaqListClientProps {
  /** 取得済みの全FAQ（並び順の保証なし） */
  faqs: Faq[];
  locale: string;
  categoryLabels: Record<FaqCategory, string>;
  updatedLabel: string;
  newBadgeLabel: string;
}

/**
 * 申請者側FAQ一覧のキーワード検索状態を保持し、絞り込み済みのFAQを
 * カテゴリ別グループ（`FaqCategoryGroup`）へ振り分けて表示するコンポーネント。
 * カテゴリ別グループ化は元々`FaqList`（Server）が持っていたが、絞り込み後の配列に
 * 対して行う必要があるため本コンポーネント（Client）へ移設した（要件10）。
 * 検索欄は`FaqSearchBar`（`DocumentSearchBar`/`LinkSearchBar`と同型）に切り出し、
 * 検索文言は`useTranslations("faq.search")`で自己解決する（`LinkListClient`と同型、要件11）。
 */
export function FaqListClient({
  faqs,
  locale,
  categoryLabels,
  updatedLabel,
  newBadgeLabel,
}: FaqListClientProps) {
  const tSearch = useTranslations("faq.search");
  const [keyword, setKeyword] = useState("");

  const filteredFaqs = useMemo(() => filterFaqs(faqs, keyword), [faqs, keyword]);

  return (
    <div className="space-y-4">
      <FaqSearchBar keyword={keyword} onChange={setKeyword} onClear={() => setKeyword("")} />
      {filteredFaqs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tSearch("noResults")}</p>
      ) : (
        <div className="space-y-6">
          {FAQ_CATEGORY_CODES.map((category) => {
            const categoryFaqs = filteredFaqs.filter(
              (faq) => faq.category === category
            );
            if (categoryFaqs.length === 0) {
              return null;
            }
            return (
              <FaqCategoryGroup
                key={category}
                category={category}
                categoryLabel={categoryLabels[category]}
                faqs={categoryFaqs}
                locale={locale}
                updatedLabel={updatedLabel}
                newBadgeLabel={newBadgeLabel}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
