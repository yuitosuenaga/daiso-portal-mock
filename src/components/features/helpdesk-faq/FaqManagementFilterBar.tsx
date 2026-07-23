"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FAQ_CATEGORY_CODES } from "@/lib/constants/faq-options";
import type { FaqManagementCategoryFilter } from "@/lib/constants/faq";

export interface FaqManagementFilters {
  keyword: string;
  category: FaqManagementCategoryFilter;
}

export interface FaqManagementFilterBarProps {
  filters: FaqManagementFilters;
  onChange: (filters: FaqManagementFilters) => void;
  onClear: () => void;
}

/**
 * FAQ管理一覧のキーワード検索・カテゴリ絞り込みバー。
 * 状態は保持せず、変更を都度`onChange`で呼び出し元へ通知する
 * （`DocumentManagementFilterBar`と同じ設計方針）。カテゴリ選択肢のラベルは
 * `faq`spec既存の`faq.categories.*`翻訳キーを再利用し、二重定義しない（要件10.8）。
 */
export function FaqManagementFilterBar({
  filters,
  onChange,
  onClear,
}: FaqManagementFilterBarProps) {
  const t = useTranslations("helpdeskFaq.list.filter");
  const tCategories = useTranslations("faq.categories");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1">
        <Label htmlFor="faq-management-filter-keyword">
          {t("keywordLabel")}
        </Label>
        <Input
          id="faq-management-filter-keyword"
          value={filters.keyword}
          placeholder={t("keywordPlaceholder")}
          onChange={(event) =>
            onChange({ ...filters, keyword: event.target.value })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="faq-management-filter-category">
          {t("categoryLabel")}
        </Label>
        <Select
          id="faq-management-filter-category"
          value={filters.category}
          options={[
            { value: "all", label: t("categoryAll") },
            ...FAQ_CATEGORY_CODES.map((category) => ({
              value: category,
              label: tCategories(category),
            })),
          ]}
          onChange={(event) =>
            onChange({
              ...filters,
              category: event.target.value as FaqManagementCategoryFilter,
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
