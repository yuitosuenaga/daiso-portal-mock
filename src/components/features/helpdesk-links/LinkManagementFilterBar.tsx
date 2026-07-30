"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { LinkCategoryAdminView } from "@/types/link-category";

/**
 * `categoryId`: "all"=絞り込みなし、"uncategorized"=カテゴリ未設定のみ、それ以外は大分類ID。
 * `subCategoryId`: "all"=絞り込みなし、それ以外は中分類ID。
 */
export interface LinkManagementFilters {
  keyword: string;
  categoryId: string;
  subCategoryId: string;
}

export interface LinkManagementFilterBarProps {
  filters: LinkManagementFilters;
  /** 大分類の絞り込み選択肢の元データ（配下の中分類選択肢を導出するため階層のまま渡す） */
  categories: LinkCategoryAdminView[];
  onChange: (filters: LinkManagementFilters) => void;
  onClear: () => void;
}

/**
 * リンク管理一覧のキーワード検索・大分類/中分類絞り込みバー。
 * 状態は保持せず、変更を都度`onChange`で呼び出し元へ通知する
 * （`DocumentManagementFilterBar`と同じ設計方針）。
 * 2026-07-29改訂（要件15）: カテゴリ絞り込みを大分類（すべて/各大分類/未設定）＋
 * 中分類（大分類選択時のみ活性・当該大分類配下に限定）の2段構成へ変更した。
 */
export function LinkManagementFilterBar({
  filters,
  categories,
  onChange,
  onClear,
}: LinkManagementFilterBarProps) {
  const t = useTranslations("helpdeskLinks.list.filter");

  const categoryOptions = [
    { value: "all", label: t("categoryAll") },
    { value: "uncategorized", label: t("categoryUnsetOption") },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];

  const selectedCategory = categories.find(
    (category) => category.id === filters.categoryId
  );
  const subCategoryOptions = [
    { value: "all", label: t("subCategoryAll") },
    ...(selectedCategory?.children.map((child) => ({
      value: child.id,
      label: child.name,
    })) ?? []),
  ];
  const isSubCategoryDisabled = !selectedCategory;

  function handleCategoryChange(categoryId: string) {
    onChange({ ...filters, categoryId, subCategoryId: "all" });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          value={filters.categoryId}
          options={categoryOptions}
          onChange={(event) => handleCategoryChange(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="link-management-filter-subcategory">
          {t("subCategoryLabel")}
        </Label>
        <Select
          id="link-management-filter-subcategory"
          value={filters.subCategoryId}
          options={subCategoryOptions}
          disabled={isSubCategoryDisabled}
          onChange={(event) =>
            onChange({ ...filters, subCategoryId: event.target.value })
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
