"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, type SelectOption } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { HelpdeskInquiryFilters } from "@/lib/helpdesk-inquiry-list";

export interface HelpdeskInquiryFilterBarProps {
  filters: HelpdeskInquiryFilters;
  onChange: (filters: HelpdeskInquiryFilters) => void;
  onClear: () => void;
  countryOptions: SelectOption[];
  categoryOptions: SelectOption[];
  statusOptions: SelectOption[];
}

/**
 * 会社名・キーワード・国・カテゴリ・対応状況の絞り込み条件を入力するフィルタバー。
 * 状態は保持せず、変更を都度 `onChange` で呼び出し元へ通知する。
 */
export function HelpdeskInquiryFilterBar({
  filters,
  onChange,
  onClear,
  countryOptions,
  categoryOptions,
  statusOptions,
}: HelpdeskInquiryFilterBarProps) {
  const t = useTranslations("helpdeskInquiries.filter");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1">
        <Label htmlFor="helpdesk-filter-company">{t("companyLabel")}</Label>
        <Input
          id="helpdesk-filter-company"
          value={filters.companyName}
          placeholder={t("companyPlaceholder")}
          onChange={(event) =>
            onChange({ ...filters, companyName: event.target.value })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="helpdesk-filter-keyword">{t("keywordLabel")}</Label>
        <Input
          id="helpdesk-filter-keyword"
          value={filters.keyword}
          placeholder={t("keywordPlaceholder")}
          onChange={(event) =>
            onChange({ ...filters, keyword: event.target.value })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="helpdesk-filter-country">{t("countryLabel")}</Label>
        <Select
          id="helpdesk-filter-country"
          value={filters.country}
          options={[{ value: "", label: t("countryAll") }, ...countryOptions]}
          onChange={(event) =>
            onChange({ ...filters, country: event.target.value })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="helpdesk-filter-category">{t("categoryLabel")}</Label>
        <Select
          id="helpdesk-filter-category"
          value={filters.category}
          options={[
            { value: "", label: t("categoryAll") },
            ...categoryOptions,
          ]}
          onChange={(event) =>
            onChange({ ...filters, category: event.target.value })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="helpdesk-filter-status">{t("statusLabel")}</Label>
        <div className="flex gap-2">
          <Select
            id="helpdesk-filter-status"
            value={filters.status}
            options={[{ value: "", label: t("statusAll") }, ...statusOptions]}
            onChange={(event) =>
              onChange({
                ...filters,
                status: event.target.value as HelpdeskInquiryFilters["status"],
              })
            }
          />
          <Button type="button" variant="outline" onClick={onClear}>
            {t("clearButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
