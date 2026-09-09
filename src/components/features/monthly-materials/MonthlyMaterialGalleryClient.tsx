"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import type { SelectOption } from "@/components/ui/select";
import {
  CategoryYearMonthFilterBar,
  type CategoryYearMonthFilterBarLabels,
} from "@/components/features/shared/CategoryYearMonthFilterBar";
import {
  MonthlyMaterialSection,
  type MonthlyMaterialFormLabels,
  type MonthlyMaterialViewerLabels,
} from "@/components/features/monthly-materials/MonthlyMaterialSection";
import {
  INITIAL_CATEGORY_YEAR_MONTH_FILTERS,
  type CategoryYearMonthFilters,
} from "@/lib/constants/category-year-month-filter";
import {
  filterMonthlyMaterials,
  gridColumnsClassName,
  groupMaterialsByYearMonth,
} from "@/lib/monthly-material-utils";
import type { MonthlyMaterial } from "@/types/monthly-material";

export interface MonthlyMaterialGalleryClientProps {
  /** 呼び出し元（`MonthlyMaterialGallery`）が取得済みの資料一覧（フィルタ前）。 */
  materials: MonthlyMaterial[];
  editable: boolean;
  locale: string;
  /** カテゴリ（`department`）フィルタ・Badge表示・フォームのカテゴリSelectで共用する選択肢。 */
  departmentOptions: SelectOption[];
  /** データに存在する年から生成した降順の選択肢。 */
  yearOptions: SelectOption[];
  /** フィルタで使う月の選択肢（1〜12月）。 */
  monthOptions: SelectOption[];
  filterBarLabels: CategoryYearMonthFilterBarLabels;
  /** 資料が1件も登録されていない場合に表示するメッセージ。 */
  emptyMessage: string;
  /** 登録はあるが、絞り込み条件に一致する資料が0件の場合に表示するメッセージ。 */
  noResultsMessage: string;
  editButtonLabel: string;
  deleteButtonLabel: string;
  deleteConfirmTitle: string;
  /**
   * `{heading}`をプレースホルダーとして含む未解決の削除確認メッセージ（`t.raw()`で取得）。
   * 年月グループごとに`heading`が異なるため、描画時にClient側で置換する
   * （Server ComponentからClient Componentへ関数を渡せないための対処）。
   */
  deleteConfirmMessageTemplate: string;
  deleteConfirmButtonLabel: string;
  deleteCancelButtonLabel: string;
  deleteErrorMessage: string;
  viewerLabels: MonthlyMaterialViewerLabels;
  formLabels: MonthlyMaterialFormLabels;
}

/**
 * 月次資料一覧のカテゴリ×年月フィルタと、フィルタ後の年月グルーピング表示を担うClient
 * Component。`MonthlyMaterialGallery`（Server Component）からデータ取得済みの一覧を受け取り、
 * フィルタ状態（`useState`）はこのコンポーネントに閉じる。フィルタ結果は`filterMonthlyMaterials`
 * （`matchesCategoryYearMonth`ベース）で計算し、サーバー再取得は行わない。
 */
export function MonthlyMaterialGalleryClient({
  materials,
  editable,
  locale,
  departmentOptions,
  yearOptions,
  monthOptions,
  filterBarLabels,
  emptyMessage,
  noResultsMessage,
  editButtonLabel,
  deleteButtonLabel,
  deleteConfirmTitle,
  deleteConfirmMessageTemplate,
  deleteConfirmButtonLabel,
  deleteCancelButtonLabel,
  deleteErrorMessage,
  viewerLabels,
  formLabels,
}: MonthlyMaterialGalleryClientProps) {
  const [filters, setFilters] = useState<CategoryYearMonthFilters>(
    INITIAL_CATEGORY_YEAR_MONTH_FILTERS
  );

  if (materials.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  const filteredMaterials = filterMonthlyMaterials(materials, filters);
  const groups = groupMaterialsByYearMonth(filteredMaterials, locale);

  function departmentLabelFor(material: MonthlyMaterial): string {
    return (
      departmentOptions.find((option) => option.value === material.department)?.label ??
      material.department
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CategoryYearMonthFilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(INITIAL_CATEGORY_YEAR_MONTH_FILTERS)}
        categoryOptions={departmentOptions}
        yearOptions={yearOptions}
        monthOptions={monthOptions}
        labels={filterBarLabels}
        showKeyword={false}
      />

      {filteredMaterials.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{noResultsMessage}</p>
          </CardContent>
        </Card>
      ) : (
        groups.map((group) => {
          const groupHeadingId = `monthly-material-group-${group.year}-${group.month}-heading`;
          return (
            <div key={`${group.year}-${group.month}`} className="flex flex-col gap-3">
              <h2 id={groupHeadingId} className="text-lg font-semibold">
                {group.heading}
              </h2>
              <div className={`grid gap-6 ${gridColumnsClassName(group.items.length)}`}>
                {group.items.map((material) => (
                  <MonthlyMaterialSection
                    key={material.id}
                    material={material}
                    heading={group.heading}
                    departmentLabel={departmentLabelFor(material)}
                    showHeading={false}
                    groupHeadingId={groupHeadingId}
                    editable={editable}
                    editButtonLabel={editButtonLabel}
                    deleteButtonLabel={deleteButtonLabel}
                    deleteConfirmTitle={deleteConfirmTitle}
                    deleteConfirmMessage={deleteConfirmMessageTemplate.replaceAll(
                      "{heading}",
                      group.heading
                    )}
                    deleteConfirmButtonLabel={deleteConfirmButtonLabel}
                    deleteCancelButtonLabel={deleteCancelButtonLabel}
                    deleteErrorMessage={deleteErrorMessage}
                    viewerLabels={viewerLabels}
                    formLabels={formLabels}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
