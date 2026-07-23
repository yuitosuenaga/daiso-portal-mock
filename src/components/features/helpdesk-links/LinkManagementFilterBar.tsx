"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LINK_CATEGORY_CODES } from "@/lib/constants/link-options";
import type { LinkManagementCategoryFilter } from "@/lib/constants/link-options";

export interface LinkManagementFilters {
  keyword: string;
  category: LinkManagementCategoryFilter;
}

export interface LinkManagementFilterBarProps {
  filters: LinkManagementFilters;
  onChange: (filters: LinkManagementFilters) => void;
  onClear: () => void;
}

/**
 * リンク管理一覧のキーワード検索・カテゴリ絞り込みバー。
 * 状態は保持せず、変更を都度`onChange`で呼び出し元へ通知する
 * （`DocumentManagementFilterBar`と同じ設計方針）。
 */
export function LinkManagementFilterBar({
  filters,
  onChange,
  onClear,
}: LinkManagementFilterBarProps) {
  const t = useTranslations("helpdeskLinks.list.filter");
  const tCategories = useTranslations("links.categories");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1">
        <Label htmlFor="link-management-filter-keyword">
          {t("keywordLabel")}
        </Label>
        <Input
          id="link-management-filter-keyword"
          value={filters.keyword}
          placeholder={t("keywordPlaceholder")}
          onChange={(event) =>
            onChange({ ...filters, keyword: event.target.value })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="link-management-filter-category">
          {t("categoryLabel")}
        </Label>
        <Select
          id="link-management-filter-category"
          value={filters.category}
          options={[
            { value: "all", label: t("categoryAll") },
            ...LINK_CATEGORY_CODES.map((code) => ({
              value: code,
              label: tCategories(code),
            })),
          ]}
          onChange={(event) =>
            onChange({
              ...filters,
              category: event.target.value as LinkManagementCategoryFilter,
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
