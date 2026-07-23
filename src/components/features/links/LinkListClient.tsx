"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { filterLinks } from "@/lib/link-utils";
import { LINK_CATEGORY_CODES } from "@/lib/constants/link-options";
import { LinkSearchBar } from "@/components/features/links/LinkSearchBar";
import { LinkCategoryGroup } from "@/components/features/links/LinkCategoryGroup";
import type { LinkWithTimestamp } from "@/types/link";

export interface LinkListClientProps {
  /** 全リンク（登録日降順で整列済み） */
  links: LinkWithTimestamp[];
  locale: string;
  opensInNewTabLabel: string;
  newBadgeLabel: string;
}

/**
 * キーワード検索の状態を保持し、`LinkSearchBar` と絞り込み済みの
 * カテゴリ別グループ（`LinkCategoryGroup`）をクライアント側で結線するコンポーネント。
 * `documents`機能の`DocumentListClient`と同型。
 */
export function LinkListClient({
  links,
  locale,
  opensInNewTabLabel,
  newBadgeLabel,
}: LinkListClientProps) {
  const tCategories = useTranslations("links.categories");
  const tSearch = useTranslations("links.search");
  const [keyword, setKeyword] = useState("");

  const filteredLinks = useMemo(() => filterLinks(links, keyword), [links, keyword]);

  return (
    <div className="space-y-4">
      <LinkSearchBar keyword={keyword} onChange={setKeyword} onClear={() => setKeyword("")} />
      {filteredLinks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tSearch("noResults")}</p>
      ) : (
        <div className="space-y-6">
          {LINK_CATEGORY_CODES.map((category) => {
            const categoryLinks = filteredLinks.filter(
              (link) => link.category === category
            );
            if (categoryLinks.length === 0) {
              return null;
            }
            return (
              <LinkCategoryGroup
                key={category}
                category={category}
                categoryLabel={tCategories(category)}
                links={categoryLinks}
                locale={locale}
                opensInNewTabLabel={opensInNewTabLabel}
                newBadgeLabel={newBadgeLabel}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
