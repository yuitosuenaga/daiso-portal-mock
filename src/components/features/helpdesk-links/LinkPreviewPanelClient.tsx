"use client";

import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LinkCategoryGroup } from "@/components/features/links/LinkCategoryGroup";
import { groupLinksByCategory } from "@/lib/link-utils";
import type { LinkWithTimestamp } from "@/types/link";
import type { LinkCategorySummary } from "@/types/link-category";

export type LinkPreviewLocale = "ja" | "en";

/** プレビュー対象言語ごとの、locale解決済みデータ・ラベル一式。 */
export interface LinkPreviewPanelLocaleData {
  categories: LinkCategorySummary[];
  opensInNewTabLabel: string;
  newBadgeLabel: string;
  uncategorizedLabel: string;
  emptyLabel: string;
}

export interface LinkPreviewPanelClientProps {
  /** 全リンク（ロケール非依存、登録日降順）。データ取得に失敗したときは空配列でよい（`hasError`で表示を制御する） */
  links: LinkWithTimestamp[];
  dataByLocale: Record<LinkPreviewLocale, LinkPreviewPanelLocaleData>;
  hasError: boolean;
  triggerLabel: string;
  dialogTitle: string;
  localeTabLabels: Record<LinkPreviewLocale, string>;
  errorMessage: string;
}

/**
 * 管理画面内から申請者側`/links`の実際の表示を確認できるプレビュー（要件16）。
 * 表示ロジックは`links-page`spec所有の`groupLinksByCategory`・`LinkCategoryGroup`を
 * そのまま再利用し、二重実装しない（要件16.3）。日英の切り替えはサーバーへの再取得を伴わず、
 * 事前に取得済みの`dataByLocale`をローカル状態で出し分けるのみ（要件16.4）。読み取り専用（要件16.6）。
 */
export function LinkPreviewPanelClient({
  links,
  dataByLocale,
  hasError,
  triggerLabel,
  dialogTitle,
  localeTabLabels,
  errorMessage,
}: LinkPreviewPanelClientProps) {
  const [activeLocale, setActiveLocale] = useState<LinkPreviewLocale>("ja");

  const activeData = dataByLocale[activeLocale];

  const groups = useMemo(
    () =>
      groupLinksByCategory(links, activeData.categories, activeData.uncategorizedLabel),
    [links, activeData]
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2" role="tablist">
          {(Object.keys(localeTabLabels) as LinkPreviewLocale[]).map((locale) => (
            <button
              key={locale}
              type="button"
              role="tab"
              aria-selected={activeLocale === locale}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                activeLocale === locale
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground"
              }`}
              onClick={() => setActiveLocale(locale)}
            >
              {localeTabLabels[locale]}
            </button>
          ))}
        </div>

        {hasError ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{activeData.emptyLabel}</p>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <LinkCategoryGroup
                key={group.categoryId ?? "uncategorized"}
                category={group.categoryId ?? "uncategorized"}
                categoryLabel={group.categoryName}
                links={group.links}
                locale={activeLocale}
                opensInNewTabLabel={activeData.opensInNewTabLabel}
                newBadgeLabel={activeData.newBadgeLabel}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
