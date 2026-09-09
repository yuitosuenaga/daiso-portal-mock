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
  urgencyOptions: SelectOption[];
}

/**
 * 問い合わせ一覧の絞り込み（キーワード・対応状況・案件種別・緊急度・新着のみ）を入力するフィルタバー。
 * 状態は保持せず、変更を都度 `onChange` で呼び出し元へ通知する。
 */
export function InquiryFilterBar({
  filters,
  onChange,
  onClear,
  statusOptions,
  categoryOptions,
  urgencyOptions,
}: InquiryFilterBarProps) {
  const t = useTranslations("inquiryList.filter");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
      <div className="space-y-1">
        <Label htmlFor="inquiry-filter-urgency">{t("urgencyLabel")}</Label>
        <Select
          id="inquiry-filter-urgency"
          value={filters.urgency}
          options={[{ value: "", label: t("urgencyAll") }, ...urgencyOptions]}
          onChange={(event) =>
            onChange({
              ...filters,
              urgency: event.target.value as InquiryFilters["urgency"],
            })
          }
        />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            id="inquiry-filter-unread-only"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={filters.unreadOnly}
            onChange={(event) =>
              onChange({ ...filters, unreadOnly: event.target.checked })
            }
          />
          <Label htmlFor="inquiry-filter-unread-only" className="cursor-pointer">
            {t("unreadOnlyLabel")}
          </Label>
        </div>
        <Button type="button" variant="outline" onClick={onClear}>
          {t("clearButton")}
        </Button>
      </div>
    </div>
  );
}
