"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, type SelectOption } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { HelpdeskInquiryFilters } from "@/lib/helpdesk-inquiry-list";
import { INQUIRY_AGING_FILTER_VALUES } from "@/lib/inquiry-aging";

export interface HelpdeskInquiryFilterBarProps {
  filters: HelpdeskInquiryFilters;
  onChange: (filters: HelpdeskInquiryFilters) => void;
  onClear: () => void;
  countryOptions: SelectOption[];
  categoryOptions: SelectOption[];
  statusOptions: SelectOption[];
  urgencyOptions: SelectOption[];
  staffOptions: SelectOption[];
}

/**
 * 会社名・キーワード・国・カテゴリ・対応状況・緊急度・未着手・対応者の絞り込み条件を入力するフィルタバー。
 * 状態は保持せず、変更を都度 `onChange` で呼び出し元へ通知する。
 */
export function HelpdeskInquiryFilterBar({
  filters,
  onChange,
  onClear,
  countryOptions,
  categoryOptions,
  statusOptions,
  urgencyOptions,
  staffOptions,
}: HelpdeskInquiryFilterBarProps) {
  const t = useTranslations("helpdeskInquiries.filter");
  const tAnalytics = useTranslations("inquiryAnalytics");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>
      <div className="space-y-1">
        <Label htmlFor="helpdesk-filter-urgency">{t("urgencyLabel")}</Label>
        <Select
          id="helpdesk-filter-urgency"
          value={filters.urgency}
          options={[{ value: "", label: t("urgencyAll") }, ...urgencyOptions]}
          onChange={(event) =>
            onChange({
              ...filters,
              urgency: event.target.value as HelpdeskInquiryFilters["urgency"],
            })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="helpdesk-filter-staff">{t("claimedByLabel")}</Label>
        <Select
          id="helpdesk-filter-staff"
          value={filters.claimedBy}
          options={[
            { value: "", label: t("claimedByAll") },
            ...staffOptions,
          ]}
          onChange={(event) =>
            onChange({ ...filters, claimedBy: event.target.value })
          }
        />
      </div>
      <div className="flex items-end gap-2">
        <div className="flex items-center gap-2">
          <input
            id="helpdesk-filter-unclaimed-only"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={filters.unclaimedOnly}
            onChange={(event) =>
              onChange({ ...filters, unclaimedOnly: event.target.checked })
            }
          />
          <Label
            htmlFor="helpdesk-filter-unclaimed-only"
            className="cursor-pointer"
          >
            {t("unclaimedOnlyLabel")}
          </Label>
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex items-center gap-2">
          <input
            id="helpdesk-filter-unresolved-only"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={filters.unresolvedOnly}
            onChange={(event) =>
              onChange({ ...filters, unresolvedOnly: event.target.checked })
            }
          />
          <Label
            htmlFor="helpdesk-filter-unresolved-only"
            className="cursor-pointer"
          >
            {tAnalytics("filter.unresolvedOnlyLabel")}
          </Label>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="helpdesk-filter-aging">
          {tAnalytics("filter.agingLabel")}
        </Label>
        <Select
          id="helpdesk-filter-aging"
          value={filters.aging}
          options={[
            { value: "", label: tAnalytics("filter.agingAll") },
            ...INQUIRY_AGING_FILTER_VALUES.map((value) => ({
              value,
              label: tAnalytics(`aging.${value}`),
            })),
          ]}
          onChange={(event) =>
            onChange({
              ...filters,
              aging: event.target.value as HelpdeskInquiryFilters["aging"],
            })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="helpdesk-filter-received-on">
          {tAnalytics("filter.receivedOnLabel")}
        </Label>
        <Input
          id="helpdesk-filter-received-on"
          type="date"
          value={filters.receivedOn}
          onChange={(event) =>
            onChange({ ...filters, receivedOn: event.target.value })
          }
        />
      </div>
      <div className="flex items-end justify-end">
        <Button type="button" variant="outline" onClick={onClear}>
          {t("clearButton")}
        </Button>
      </div>
    </div>
  );
}
