"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DOCUMENT_SUB_CATEGORY_FILTER_ALL } from "@/components/features/documents/DocumentListClient";
import type { DocumentSubCategoryOption } from "@/types/document-category";

export interface DocumentSearchBarProps {
  keyword: string;
  onChange: (keyword: string) => void;
  /** 当該大分類配下で自社に公開されている中分類（要件21.5）。0件のときセレクトを描画しない。 */
  subCategories: DocumentSubCategoryOption[];
  subCategoryId: string;
  onSubCategoryChange: (subCategoryId: string) => void;
  onClear: () => void;
}

/**
 * 書類一覧の検索欄（キーワード＋中分類の絞り込み）。状態は保持せず、変更を都度
 * `onChange`/`onSubCategoryChange` で呼び出し元へ通知する（`AnnouncementFilterBar`と同じ設計方針）。
 */
export function DocumentSearchBar({
  keyword,
  onChange,
  subCategories,
  subCategoryId,
  onSubCategoryChange,
  onClear,
}: DocumentSearchBarProps) {
  const t = useTranslations("documents.search");

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex-1 space-y-1 min-w-[240px]">
        <Label htmlFor="document-search-keyword">{t("keywordLabel")}</Label>
        <Input
          id="document-search-keyword"
          value={keyword}
          placeholder={t("keywordPlaceholder")}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {subCategories.length > 0 && (
        <div className="space-y-1 min-w-[200px]">
          <Label htmlFor="document-search-sub-category">
            {t("subCategoryLabel")}
          </Label>
          <Select
            id="document-search-sub-category"
            value={subCategoryId}
            options={[
              {
                value: DOCUMENT_SUB_CATEGORY_FILTER_ALL,
                label: t("subCategoryAll"),
              },
              ...subCategories.map((subCategory) => ({
                value: subCategory.id,
                label: subCategory.name,
              })),
            ]}
            onChange={(event) => onSubCategoryChange(event.target.value)}
          />
        </div>
      )}
      <Button type="button" variant="outline" onClick={onClear}>
        {t("clearButton")}
      </Button>
    </div>
  );
}
