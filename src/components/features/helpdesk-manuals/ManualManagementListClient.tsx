"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import { filterManuals, manualTargetingLabel } from "@/lib/manual-utils";
import type { ManualTargetingLabelDictionary } from "@/lib/manual-utils";
import { formatFileSize } from "@/lib/attachment-utils";
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
import { DeleteManualButton } from "@/components/features/helpdesk-manuals/DeleteManualButton";
import {
  ManagementListCard,
  ManagementListRow,
  ManagementListRows,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { Manual } from "@/types/manual";

export interface ManualManagementListClientProps {
  /** 年月降順で整列済みの全マニュアル */
  manuals: Manual[];
  locale: string;
  listTitle: string;
  editLinkLabel: string;
  categoryLabel: string;
  revisionLabel: string;
  sourceTypeUploadBadgeLabel: string;
  sourceTypeGoogleBadgeLabel: string;
  targetingLabels: ManualTargetingLabelDictionary;
}

/**
 * マニュアル管理一覧のキーワード×カテゴリ×年×月の絞り込み状態を保持し、絞り込み済みの一覧を
 * 描画するコンポーネント。申請者側`ManualListClient`に相当する管理一覧版
 * （`documents`specの`DocumentManagementListClient`と同型）。
 */
export function ManualManagementListClient({
  manuals,
  locale,
  listTitle,
  editLinkLabel,
  categoryLabel,
  revisionLabel,
  sourceTypeUploadBadgeLabel,
  sourceTypeGoogleBadgeLabel,
  targetingLabels,
}: ManualManagementListClientProps) {
  const t = useTranslations("helpdeskManuals.list.filter");
  const tDelete = useTranslations("helpdeskManuals.delete");
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
        <ManagementListCard title={listTitle}>
          <ManagementListRows>
            {filteredManuals.map((manual) => (
              <ManagementListRow key={manual.id}>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{manual.title}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded border border-input px-1.5 py-0.5">
                      {manual.sourceType === "google"
                        ? sourceTypeGoogleBadgeLabel
                        : sourceTypeUploadBadgeLabel}
                    </span>
                    {manual.sourceType === "upload" && (
                      <span>{formatFileSize(manual.fileSize)}</span>
                    )}
                    <span>
                      {categoryLabel}: {tCategories(manual.category)}
                    </span>
                    <span>
                      {revisionLabel}: {manual.year}/{manual.month}
                    </span>
                    <span>{manualTargetingLabel(manual.targeting, targetingLabels)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/helpdesk/manuals/${manual.id}/edit`}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {editLinkLabel}
                  </Link>
                  <DeleteManualButton
                    manualId={manual.id}
                    title={manual.title}
                    deleteButtonLabel={tDelete("buttonLabel")}
                    confirmTitle={tDelete("confirmTitle")}
                    confirmMessage={tDelete("confirmMessage", { title: manual.title })}
                    confirmButtonLabel={tDelete("confirmButton")}
                    cancelButtonLabel={tDelete("cancelButton")}
                    errorMessage={tDelete("errorMessage")}
                  />
                </div>
              </ManagementListRow>
            ))}
          </ManagementListRows>
        </ManagementListCard>
      )}
    </div>
  );
}
