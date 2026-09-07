"use client";

import { useState } from "react";
import type { SelectOption } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/features/documents/PdfViewer";
import { MonthlyMaterialForm } from "@/components/features/monthly-materials/MonthlyMaterialForm";
import { DeleteMonthlyMaterialButton } from "@/components/features/monthly-materials/DeleteMonthlyMaterialButton";
import { toMonthlyMaterialFormDefaultValues } from "@/lib/monthly-material-form-utils";
import type { MonthlyMaterial } from "@/types/monthly-material";

/** 資料本体（アップロード型・Google型）のプレビュー表示に必要な文言をまとめて渡す。 */
export interface MonthlyMaterialViewerLabels {
  downloadLinkLabel: string;
  openOriginalLinkLabel: string;
  googlePreviewErrorMessage: string;
  googlePreviewHint: string;
}

/** `MonthlyMaterialForm`が要求する入力用選択肢・文言をまとめて渡す（編集モードのみ使用）。 */
export interface MonthlyMaterialFormLabels {
  countryOptions: SelectOption[];
  companyOptions: SelectOption[];
  yearLabel: string;
  monthLabel: string;
  monthOptions: SelectOption[];
  sourceTypeLabel: string;
  sourceTypeUploadOption: string;
  sourceTypeGoogleOption: string;
  fileLabel: string;
  fileHint: string;
  removeFileButtonLabel: string;
  googleUrlLabel: string;
  googleUrlPlaceholder: string;
  googleUrlHint: string;
  targetingLabel: string;
  targetingAllOption: string;
  targetingCountriesOption: string;
  targetingCompaniesOption: string;
  countriesLabel: string;
  companiesLabel: string;
  submitButtonLabel: string;
  cancelButtonLabel: string;
  requiredErrorMessage: string;
  countriesRequiredErrorMessage: string;
  companiesRequiredErrorMessage: string;
  fileRequiredErrorMessage: string;
  sizeExceededMessage: string;
  typeNotAllowedMessage: string;
  readFailedMessage: string;
  googleUrlInvalidMessage: string;
  duplicateYearMonthErrorMessage: string;
  requiredIndicator: string;
  submitErrorMessage: string;
}

export interface MonthlyMaterialSectionProps {
  material: MonthlyMaterial;
  /** 見出し（例:「2026年9月」）。ロケールに応じた表示名は呼び出し側で解決済み。 */
  heading: string;
  /** ヘルプデスク側（編集可能な文脈）かどうか。falseの場合、編集ボタン等を一切表示しない。 */
  editable: boolean;
  editButtonLabel: string;
  deleteButtonLabel: string;
  deleteConfirmTitle: string;
  deleteConfirmMessage: string;
  deleteConfirmButtonLabel: string;
  deleteCancelButtonLabel: string;
  deleteErrorMessage: string;
  viewerLabels: MonthlyMaterialViewerLabels;
  formLabels: MonthlyMaterialFormLabels;
}

/**
 * 1年月分の資料について、表示モード（見出し・PDFプレビュー・編集ボタン）と
 * 編集モード（`MonthlyMaterialForm`＋プレビュー継続表示）を、画面遷移なしで切り替える。
 * `editable=false`（海外販社側）の場合は表示モードのみで、編集関連のUIを一切描画しない。
 * モード状態はこのコンポーネント単位で独立して保持するため、あるセクションを編集モードに
 * 切り替えても他の年月セクションの表示モードには影響しない。
 */
export function MonthlyMaterialSection({
  material,
  heading,
  editable,
  editButtonLabel,
  deleteButtonLabel,
  deleteConfirmTitle,
  deleteConfirmMessage,
  deleteConfirmButtonLabel,
  deleteCancelButtonLabel,
  deleteErrorMessage,
  viewerLabels,
  formLabels,
}: MonthlyMaterialSectionProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const preview =
    material.sourceType === "google" ? (
      <PdfViewer
        variant="google"
        embedUrl={material.googleEmbedUrl}
        title={heading}
        originalUrl={material.googleUrl}
        openOriginalLabel={viewerLabels.openOriginalLinkLabel}
        previewErrorMessage={viewerLabels.googlePreviewErrorMessage}
        previewHint={viewerLabels.googlePreviewHint}
      />
    ) : (
      <PdfViewer
        variant="upload"
        dataUrl={material.dataUrl}
        title={heading}
        downloadFileName={material.fileName}
        downloadLinkLabel={viewerLabels.downloadLinkLabel}
      />
    );

  if (mode === "edit") {
    return (
      <section aria-labelledby={`monthly-material-${material.id}-heading`} className="flex flex-col gap-4">
        <h2 id={`monthly-material-${material.id}-heading`} className="text-lg font-semibold">
          {heading}
        </h2>
        <MonthlyMaterialForm
          category={material.category}
          mode="edit"
          materialId={material.id}
          defaultValues={toMonthlyMaterialFormDefaultValues(material)}
          onCancel={() => setMode("view")}
          onSuccess={() => setMode("view")}
          {...formLabels}
        />
        {preview}
      </section>
    );
  }

  return (
    <section aria-labelledby={`monthly-material-${material.id}-heading`} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id={`monthly-material-${material.id}-heading`} className="text-lg font-semibold">
          {heading}
        </h2>
        {editable && (
          <Button type="button" variant="outline" onClick={() => setMode("edit")}>
            {editButtonLabel}
          </Button>
        )}
      </div>
      {preview}
      {editable && (
        <DeleteMonthlyMaterialButton
          materialId={material.id}
          category={material.category}
          label={heading}
          deleteButtonLabel={deleteButtonLabel}
          confirmTitle={deleteConfirmTitle}
          confirmMessage={deleteConfirmMessage}
          confirmButtonLabel={deleteConfirmButtonLabel}
          cancelButtonLabel={deleteCancelButtonLabel}
          errorMessage={deleteErrorMessage}
        />
      )}
    </section>
  );
}
