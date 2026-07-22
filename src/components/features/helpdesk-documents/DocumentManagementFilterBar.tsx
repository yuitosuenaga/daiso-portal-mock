"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type {
  DocumentManagementScopeFilter,
  DocumentManagementSourceTypeFilter,
} from "@/lib/constants/document";

export interface DocumentManagementFilters {
  keyword: string;
  sourceType: DocumentManagementSourceTypeFilter;
  scope: DocumentManagementScopeFilter;
}

export interface DocumentManagementFilterBarProps {
  filters: DocumentManagementFilters;
  onChange: (filters: DocumentManagementFilters) => void;
  onClear: () => void;
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
}: DocumentManagementFilterBarProps) {
  const t = useTranslations("helpdeskDocuments.list.filter");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="flex items-end">
        <Button type="button" variant="outline" onClick={onClear}>
          {t("clearButton")}
        </Button>
      </div>
    </div>
  );
}
