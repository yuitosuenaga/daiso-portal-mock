"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, type SelectOption } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_YEAR_MONTH_FILTER_ALL,
  type CategoryYearMonthFilters,
} from "@/lib/constants/category-year-month-filter";

export interface CategoryYearMonthFilterBarLabels {
  keywordLabel?: string;
  keywordPlaceholder?: string;
  categoryLabel: string;
  categoryAll: string;
  yearLabel: string;
  yearAll: string;
  monthLabel: string;
  monthAll: string;
  clearButton: string;
}

export interface CategoryYearMonthFilterBarProps {
  filters: CategoryYearMonthFilters;
  onChange: (filters: CategoryYearMonthFilters) => void;
  onClear: () => void;
  categoryOptions: SelectOption[];
  yearOptions: SelectOption[];
  monthOptions: SelectOption[];
  labels: CategoryYearMonthFilterBarLabels;
  /** キーワード入力欄を表示するかどうか。既定は非表示。 */
  showKeyword?: boolean;
}

/**
 * カテゴリ×年月の検索フィルタ共通UI。複数画面（売場検討会/POP、マニュアル等）から
 * 利用する想定の共通部品のため、状態は保持せず、変更を都度`onChange`/`onClear`で
 * 呼び出し元へ通知する（`DocumentSearchBar`/`DocumentManagementFilterBar`と同じ設計方針）。
 * ラベルはすべてpropsで受け取り、`useTranslations`はここでは呼ばない。
 */
export function CategoryYearMonthFilterBar({
  filters,
  onChange,
  onClear,
  categoryOptions,
  yearOptions,
  monthOptions,
  labels,
  showKeyword = false,
}: CategoryYearMonthFilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      {showKeyword && (
        <div className="flex-1 space-y-1 min-w-[240px]">
          <Label htmlFor="category-year-month-filter-keyword">
            {labels.keywordLabel}
          </Label>
          <Input
            id="category-year-month-filter-keyword"
            value={filters.keyword}
            placeholder={labels.keywordPlaceholder}
            onChange={(event) =>
              onChange({ ...filters, keyword: event.target.value })
            }
          />
        </div>
      )}
      <div className="space-y-1 min-w-[180px]">
        <Label htmlFor="category-year-month-filter-category">
          {labels.categoryLabel}
        </Label>
        <Select
          id="category-year-month-filter-category"
          value={filters.category}
          options={[
            { value: CATEGORY_YEAR_MONTH_FILTER_ALL, label: labels.categoryAll },
            ...categoryOptions,
          ]}
          onChange={(event) =>
            onChange({ ...filters, category: event.target.value })
          }
        />
      </div>
      <div className="space-y-1 min-w-[140px]">
        <Label htmlFor="category-year-month-filter-year">
          {labels.yearLabel}
        </Label>
        <Select
          id="category-year-month-filter-year"
          value={filters.year}
          options={[
            { value: CATEGORY_YEAR_MONTH_FILTER_ALL, label: labels.yearAll },
            ...yearOptions,
          ]}
          onChange={(event) =>
            onChange({ ...filters, year: event.target.value })
          }
        />
      </div>
      <div className="space-y-1 min-w-[140px]">
        <Label htmlFor="category-year-month-filter-month">
          {labels.monthLabel}
        </Label>
        <Select
          id="category-year-month-filter-month"
          value={filters.month}
          options={[
            { value: CATEGORY_YEAR_MONTH_FILTER_ALL, label: labels.monthAll },
            ...monthOptions,
          ]}
          onChange={(event) =>
            onChange({ ...filters, month: event.target.value })
          }
        />
      </div>
      <Button type="button" variant="outline" onClick={onClear}>
        {labels.clearButton}
      </Button>
    </div>
  );
}
