"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { filterManuals } from "@/lib/manual-utils";
import {
  buildMonthOptions,
  buildYearOptions,
  collectYears,
  matchesCategoryYearMonth,
} from "@/lib/category-year-month-filter";
import {
  INITIAL_CATEGORY_YEAR_MONTH_FILTERS,
  type CategoryYearMonthFilters,
} from "@/lib/constants/category-year-month-filter";
import { MANUAL_CATEGORIES } from "@/lib/constants/manual";
import { CategoryYearMonthFilterBar } from "@/components/features/shared/CategoryYearMonthFilterBar";
import { ManualListItem } from "@/components/features/manuals/ManualListItem";
import type { Manual } from "@/types/manual";

export interface ManualListClientProps {
  /** 年月降順で整列済みのマニュアル */
  manuals: Manual[];
  locale: string;
  downloadLinkLabel: string;
  openOriginalLinkLabel: string;
  revisionLabel: string;
}

/**
 * キーワード・カテゴリ・年・月の絞り込み状態を保持し、`CategoryYearMonthFilterBar`
 * （`showKeyword={true}`）と絞り込み済みの一覧（`ManualListItem`）をクライアント側で結線する
 * コンポーネント（`DocumentListClient`のマニュアル版）。絞り込みはすべてクライアント側の
 * 即時フィルタとし、サーバー再取得は行わない。
 */
export function ManualListClient({
  manuals,
  locale,
  downloadLinkLabel,
  openOriginalLinkLabel,
  revisionLabel,
}: ManualListClientProps) {
  const t = useTranslations("manuals.filter");
  const tCategories = useTranslations("manuals.categories");
  const [filters, setFilters] = useState<CategoryYearMonthFilters>(
    INITIAL_CATEGORY_YEAR_MONTH_FILTERS
  );

  const categoryOptions = useMemo(
    () =>
      MANUAL_CATEGORIES.map((category) => ({
        value: category,
        label: tCategories(category),
      })),
    [tCategories]
  );
  const yearOptions = useMemo(
    () => buildYearOptions(collectYears(manuals)),
    [manuals]
  );
  const monthOptions = useMemo(() => buildMonthOptions(locale), [locale]);

  const filteredManuals = useMemo(() => {
    const byKeyword = filterManuals(manuals, filters.keyword);
    return byKeyword.filter((manual) =>
      matchesCategoryYearMonth(
        manual,
        filters,
        (item) => item.category,
        (item) => item.year,
        (item) => item.month
      )
    );
  }, [manuals, filters]);

  function handleClear() {
    setFilters(INITIAL_CATEGORY_YEAR_MONTH_FILTERS);
  }

  return (
    <div className="space-y-4">
      <CategoryYearMonthFilterBar
        filters={filters}
        onChange={setFilters}
        onClear={handleClear}
        categoryOptions={categoryOptions}
        yearOptions={yearOptions}
        monthOptions={monthOptions}
        showKeyword
        labels={{
          keywordLabel: t("keywordLabel"),
          keywordPlaceholder: t("keywordPlaceholder"),
          categoryLabel: t("categoryLabel"),
          categoryAll: t("categoryAll"),
          yearLabel: t("yearLabel"),
          yearAll: t("yearAll"),
          monthLabel: t("monthLabel"),
          monthAll: t("monthAll"),
          clearButton: t("clearButton"),
        }}
      />
      {filteredManuals.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredManuals.map((manual) => (
            <ManualListItem
              key={manual.id}
              manual={manual}
              categoryLabel={tCategories(manual.category)}
              revisionLabel={revisionLabel}
              downloadLinkLabel={downloadLinkLabel}
              openOriginalLinkLabel={openOriginalLinkLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
