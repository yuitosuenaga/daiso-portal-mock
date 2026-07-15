"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, type SelectOption } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { InquiryFilters } from "@/lib/inquiry-filter";

export interface InquiryFilterBarProps {
  filters: InquiryFilters;
  onChange: (filters: InquiryFilters) => void;
  onClear: () => void;
  statusOptions: SelectOption[];
  categoryOptions: SelectOption[];
}

/**
 * 問い合わせ一覧の絞り込み（キーワード・対応状況・案件種別）を入力するフィルタバー。
 * 状態は保持せず、変更を都度 `onChange` で呼び出し元へ通知する。
 */
export function InquiryFilterBar({
  filters,
  onChange,
  onClear,
  statusOptions,
  categoryOptions,
}: InquiryFilterBarProps) {
  const t = useTranslations("inquiryList.filter");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor="inquiry-filter-keyword">{t("keywordLabel")}</Label>
        <Input
          id="inquiry-filter-keyword"
          value={filters.keyword}
          placeholder={t("keywordPlaceholder")}
          onChange={(event) =>
            onChange({ ...filters, keyword: event.target.value })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="inquiry-filter-status">{t("statusLabel")}</Label>
        <Select
          id="inquiry-filter-status"
          value={filters.status}
          options={[{ value: "", label: t("statusAll") }, ...statusOptions]}
          onChange={(event) =>
            onChange({
              ...filters,
              status: event.target.value as InquiryFilters["status"],
            })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="inquiry-filter-category">{t("categoryLabel")}</Label>
        <Select
          id="inquiry-filter-category"
          value={filters.category}
          options={[
            { value: "", label: t("categoryAll") },
            ...categoryOptions,
          ]}
          onChange={(event) =>
            onChange({
              ...filters,
              category: event.target.value as InquiryFilters["category"],
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
