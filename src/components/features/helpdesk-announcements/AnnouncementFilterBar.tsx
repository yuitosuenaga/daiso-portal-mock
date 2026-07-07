"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, type SelectOption } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { HelpdeskAnnouncementFilters } from "@/lib/helpdesk-announcement-list";

export interface AnnouncementFilterBarProps {
  filters: HelpdeskAnnouncementFilters;
  onChange: (filters: HelpdeskAnnouncementFilters) => void;
  onClear: () => void;
  categoryOptions: SelectOption[];
}

/**
 * タイトルキーワード・種別・対応要否の絞り込み条件を入力するフィルタバー。
 * 状態は保持せず、変更を都度 `onChange` で呼び出し元へ通知する。
 */
export function AnnouncementFilterBar({
  filters,
  onChange,
  onClear,
  categoryOptions,
}: AnnouncementFilterBarProps) {
  const t = useTranslations("helpdeskAnnouncements.list.filter");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor="announcement-filter-keyword">{t("keywordLabel")}</Label>
        <Input
          id="announcement-filter-keyword"
          value={filters.keyword}
          placeholder={t("keywordPlaceholder")}
          onChange={(event) =>
            onChange({ ...filters, keyword: event.target.value })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="announcement-filter-category">{t("categoryLabel")}</Label>
        <Select
          id="announcement-filter-category"
          value={filters.category}
          options={[{ value: "", label: t("categoryAll") }, ...categoryOptions]}
          onChange={(event) =>
            onChange({ ...filters, category: event.target.value })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="announcement-filter-action-required">
          {t("actionRequiredLabel")}
        </Label>
        <Select
          id="announcement-filter-action-required"
          value={filters.actionRequired}
          options={[
            { value: "", label: t("actionRequiredAll") },
            { value: "true", label: t("actionRequiredTrue") },
            { value: "false", label: t("actionRequiredFalse") },
          ]}
          onChange={(event) =>
            onChange({
              ...filters,
              actionRequired: event.target
                .value as HelpdeskAnnouncementFilters["actionRequired"],
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
