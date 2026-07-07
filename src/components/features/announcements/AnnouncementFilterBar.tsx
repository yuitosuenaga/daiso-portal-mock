"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, type SelectOption } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { AnnouncementFilters } from "@/lib/announcement-list";

export interface AnnouncementFilterBarProps {
  filters: AnnouncementFilters;
  onChange: (filters: AnnouncementFilters) => void;
  onClear: () => void;
  categoryOptions: SelectOption[];
}

/**
 * 申請者側お知らせ一覧の絞り込み（タイトルキーワード・種別・対応要否）を入力するフィルタバー。
 * 状態は保持せず、変更を都度 `onChange` で呼び出し元へ通知する。
 */
export function AnnouncementFilterBar({
  filters,
  onChange,
  onClear,
  categoryOptions,
}: AnnouncementFilterBarProps) {
  const t = useTranslations("announcements.filter");

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
          ]}
          onChange={(event) =>
            onChange({
              ...filters,
              actionRequired: event.target
                .value as AnnouncementFilters["actionRequired"],
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
