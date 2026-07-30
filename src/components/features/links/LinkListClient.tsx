"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { filterLinks, groupLinksByCategory } from "@/lib/link-utils";
import { LinkSearchBar } from "@/components/features/links/LinkSearchBar";
import { LinkCategoryGroup } from "@/components/features/links/LinkCategoryGroup";
import type { LinkWithTimestamp } from "@/types/link";
import type { LinkCategorySummary } from "@/types/link-category";

const UNCATEGORIZED_KEY = "uncategorized";

export interface LinkListClientProps {
  /** 全リンク（登録日降順で整列済み） */
  links: LinkWithTimestamp[];
  /** 大分類・中分類（`links-management`spec提供、名前はlocale解決済み、displayOrder昇順） */
  categories: LinkCategorySummary[];
  locale: string;
  opensInNewTabLabel: string;
  newBadgeLabel: string;
  /** カテゴリ未設定のリンクをまとめる「未分類」グループの見出し */
  uncategorizedLabel: string;
}

/**
 * キーワード検索の状態を保持し、`LinkSearchBar` と絞り込み済みの
 * 大分類別グループ（`LinkCategoryGroup`）をクライアント側で結線するコンポーネント。
 * `documents`機能の`DocumentListClient`と同型。2026-07-29改訂: グループ化の単位を
 * 固定4値カテゴリから`links-management`spec提供の大分類（`LinkCategorySummary`）へ変更した
 * （要件11.1。中分類サブ表示・displayOrder追随は`groupLinksByCategory`実装時に統合する）。
 */
export function LinkListClient({
  links,
  categories,
  locale,
  opensInNewTabLabel,
  newBadgeLabel,
  uncategorizedLabel,
}: LinkListClientProps) {
  const tSearch = useTranslations("links.search");
  const [keyword, setKeyword] = useState("");

  const filteredLinks = useMemo(() => filterLinks(links, keyword), [links, keyword]);

  const groups = useMemo(
    () =>
      groupLinksByCategory(filteredLinks, categories, uncategorizedLabel).map(
        (group) => ({
          key: group.categoryId ?? UNCATEGORIZED_KEY,
          label: group.categoryName,
          links: group.links,
        })
      ),
    [categories, filteredLinks, uncategorizedLabel]
  );

  return (
    <div className="space-y-4">
      <LinkSearchBar keyword={keyword} onChange={setKeyword} onClear={() => setKeyword("")} />
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tSearch("noResults")}</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <LinkCategoryGroup
              key={group.key}
              category={group.key}
              categoryLabel={group.label}
              links={group.links}
              locale={locale}
              opensInNewTabLabel={opensInNewTabLabel}
              newBadgeLabel={newBadgeLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
