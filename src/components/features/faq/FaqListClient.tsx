"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { filterFaqs } from "@/lib/faq-utils";
import { FAQ_CATEGORY_CODES } from "@/lib/constants/faq-options";
import { FaqCategoryGroup } from "@/components/features/faq/FaqCategoryGroup";
import type { Faq, FaqCategory } from "@/types/faq";

export interface FaqListClientProps {
  /** 取得済みの全FAQ（並び順の保証なし） */
  faqs: Faq[];
  locale: string;
  categoryLabels: Record<FaqCategory, string>;
  updatedLabel: string;
  newBadgeLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchNoResults: string;
  searchClearButton: string;
}

/**
 * 申請者側FAQ一覧のキーワード検索状態を保持し、絞り込み済みのFAQを
 * カテゴリ別グループ（`FaqCategoryGroup`）へ振り分けて表示するコンポーネント。
 * カテゴリ別グループ化は元々`FaqList`（Server）が持っていたが、絞り込み後の配列に
 * 対して行う必要があるため本コンポーネント（Client）へ移設した（要件10）。
 */
export function FaqListClient({
  faqs,
  locale,
  categoryLabels,
  updatedLabel,
  newBadgeLabel,
  searchLabel,
  searchPlaceholder,
  searchNoResults,
  searchClearButton,
}: FaqListClientProps) {
  const [keyword, setKeyword] = useState("");

  const filteredFaqs = useMemo(() => filterFaqs(faqs, keyword), [faqs, keyword]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] flex-1 space-y-1">
          <Label htmlFor="faq-search-keyword">{searchLabel}</Label>
          <Input
            id="faq-search-keyword"
            value={keyword}
            placeholder={searchPlaceholder}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setKeyword("")}>
          {searchClearButton}
        </Button>
      </div>
      {filteredFaqs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{searchNoResults}</p>
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
