"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DOCUMENT_MANAGEMENT_CATEGORY_FILTER_ALL,
  DOCUMENT_MANAGEMENT_CATEGORY_FILTER_UNASSIGNED,
  DOCUMENT_MANAGEMENT_SUB_CATEGORY_FILTER_ALL,
  toCategoryFilterValue,
  type DocumentManagementCategoryFilter,
  type DocumentManagementScopeFilter,
  type DocumentManagementSourceTypeFilter,
  type DocumentManagementSubCategoryFilter,
} from "@/lib/constants/document";
import type { DocumentCategoryFormOption } from "@/components/features/helpdesk-documents/DocumentForm";

export interface DocumentManagementFilters {
  keyword: string;
  sourceType: DocumentManagementSourceTypeFilter;
  scope: DocumentManagementScopeFilter;
  category: DocumentManagementCategoryFilter;
  subCategory: DocumentManagementSubCategoryFilter;
}

export interface DocumentManagementFilterBarProps {
  filters: DocumentManagementFilters;
  onChange: (filters: DocumentManagementFilters) => void;
  onClear: () => void;
  /** 大分類・中分類の絞り込み選択肢（既定言語＝jaの名称）。 */
  categories: DocumentCategoryFormOption[];
}

/**
 * ドキュメント管理一覧のキーワード検索・登録方式/公開範囲種別の絞り込みバー。
 * 状態は保持せず、変更を都度`onChange`で呼び出し元へ通知する
 * （`AnnouncementFilterBar`/`DocumentSearchBar`と同じ設計方針）。
 */
export function DocumentManagementFilterBar({
  filters,
  onChange,
  onClear,
  categories,
}: DocumentManagementFilterBarProps) {
  const t = useTranslations("helpdeskDocuments.list.filter");

  const selectedCategory =
    filters.category === DOCUMENT_MANAGEMENT_CATEGORY_FILTER_ALL ||
    filters.category === DOCUMENT_MANAGEMENT_CATEGORY_FILTER_UNASSIGNED
      ? undefined
      : categories.find(
          (category) => toCategoryFilterValue(category.id) === filters.category
        );

  function handleCategoryChange(value: string) {
    // 大分類を「すべて」または「未設定」に変更したときは中分類の選択を
    // 「すべての中分類」へリセットする（要件22.3）。
    onChange({
      ...filters,
      category: value as DocumentManagementCategoryFilter,
      subCategory: DOCUMENT_MANAGEMENT_SUB_CATEGORY_FILTER_ALL,
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <div className="space-y-1">
        <Label htmlFor="document-management-filter-keyword">
          {t("keywordLabel")}
        </Label>
        <Input
          id="document-management-filter-keyword"
          value={filters.keyword}
          placeholder={t("keywordPlaceholder")}
          onChange={(event) =>
            onChange({ ...filters, keyword: event.target.value })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="document-management-filter-source-type">
          {t("sourceTypeLabel")}
        </Label>
        <Select
          id="document-management-filter-source-type"
          value={filters.sourceType}
          options={[
            { value: "all", label: t("sourceTypeAll") },
            { value: "upload", label: t("sourceTypeUpload") },
            { value: "google", label: t("sourceTypeGoogle") },
          ]}
          onChange={(event) =>
            onChange({
              ...filters,
              sourceType: event.target
                .value as DocumentManagementSourceTypeFilter,
            })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="document-management-filter-scope">
          {t("scopeLabel")}
        </Label>
        <Select
          id="document-management-filter-scope"
          value={filters.scope}
          options={[
            { value: "all", label: t("scopeAll") },
            { value: "all-scope", label: t("scopeAllScope") },
            { value: "countries", label: t("scopeCountries") },
            { value: "companies", label: t("scopeCompanies") },
          ]}
          onChange={(event) =>
            onChange({
              ...filters,
              scope: event.target.value as DocumentManagementScopeFilter,
            })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="document-management-filter-category">
          {t("categoryLabel")}
        </Label>
        <Select
          id="document-management-filter-category"
          value={filters.category}
          options={[
            { value: DOCUMENT_MANAGEMENT_CATEGORY_FILTER_ALL, label: t("categoryAll") },
            {
              value: DOCUMENT_MANAGEMENT_CATEGORY_FILTER_UNASSIGNED,
              label: t("categoryUnassigned"),
            },
            ...categories.map((category) => ({
              value: toCategoryFilterValue(category.id),
              label: category.name,
            })),
          ]}
          onChange={(event) => handleCategoryChange(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="document-management-filter-sub-category">
          {t("subCategoryLabel")}
        </Label>
        <Select
          id="document-management-filter-sub-category"
          value={filters.subCategory}
          disabled={!selectedCategory}
          options={[
            {
              value: DOCUMENT_MANAGEMENT_SUB_CATEGORY_FILTER_ALL,
              label: t("subCategoryAll"),
            },
            ...(selectedCategory?.subCategories.map((subCategory) => ({
              value: toCategoryFilterValue(subCategory.id),
              label: subCategory.name,
            })) ?? []),
          ]}
          onChange={(event) =>
            onChange({
              ...filters,
              subCategory: event.target
                .value as DocumentManagementSubCategoryFilter,
            })
          }
        />
      </div>
      <div className="flex items-end">
        <Button type="button" variant="outline" onClick={onClear}>
          {t("clearButton")}
        </Button>
      </div>
    </div>
  );
}
