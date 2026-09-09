"use client";

import { useState } from "react";
import type { SelectOption } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  /** サムネイル表示のプレビューを拡大表示に切り替えるボタンのラベル。 */
  expandButtonLabel: string;
}

/** `MonthlyMaterialForm`が要求する入力用選択肢・文言をまとめて渡す（編集モードのみ使用）。 */
export interface MonthlyMaterialFormLabels {
  countryOptions: SelectOption[];
  companyOptions: SelectOption[];
  departmentLabel: string;
  departmentOptions: SelectOption[];
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
  requiredIndicator: string;
  submitErrorMessage: string;
}

export interface MonthlyMaterialSectionProps {
  material: MonthlyMaterial;
  /** 見出し（例:「2026年9月」）。ロケールに応じた表示名は呼び出し側で解決済み。 */
  heading: string;
  /** `material.department`に対応する翻訳済みラベル（例:「季節・催事」）。Badgeとして表示する。 */
  departmentLabel: string;
  /**
   * 見出し（`<h2>`）を自身で描画するかどうか。省略時はtrue。同一年月に複数件の資料がある場合、
   * 呼び出し側（`MonthlyMaterialGallery`）が年月ごとに見出しを1つだけ描画するため、
   * 各資料側の見出し描画をfalseにして重複表示を避ける。
   */
  showHeading?: boolean;
  /** `showHeading=false`の場合に、呼び出し側が描画する見出し要素のidを渡す（aria-labelledby用）。 */
  groupHeadingId?: string;
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
 * 1件の資料について、表示モード（見出し・PDFプレビュー・編集ボタン）と
 * 編集モード（`MonthlyMaterialForm`＋プレビュー継続表示）を、画面遷移なしで切り替える。
 * `editable=false`（海外販社側）の場合は表示モードのみで、編集関連のUIを一切描画しない。
 * モード状態はこのコンポーネント単位で独立して保持するため、ある資料を編集モードに
 * 切り替えても他の資料の表示モードには影響しない。同一年月に複数件ある場合、見出しは
 * 呼び出し側が年月ごとに1つだけ描画する（`showHeading=false`＋`groupHeadingId`）。
 * 表示モードのプレビューはサムネイル（`PdfViewer`の`size="compact"`）で表示し、
 * クリックすると`Dialog`で通常サイズのプレビューを重ねて表示する。
 */
export function MonthlyMaterialSection({
  material,
  heading,
  departmentLabel,
  showHeading = true,
  groupHeadingId,
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
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">{material.fileName}</p>
        <PdfViewer
          variant="upload"
          dataUrl={material.dataUrl}
          title={heading}
          downloadFileName={material.fileName}
          downloadLinkLabel={viewerLabels.downloadLinkLabel}
          hideDownloadLink
        />
      </div>
    );

  const compactPreview =
    material.sourceType === "google" ? (
      <PdfViewer
        variant="google"
        size="compact"
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
        size="compact"
        dataUrl={material.dataUrl}
        title={heading}
        downloadFileName={material.fileName}
        downloadLinkLabel={viewerLabels.downloadLinkLabel}
        hideDownloadLink
      />
    );

  if (mode === "edit") {
    return (
      <section
        aria-labelledby={showHeading ? `monthly-material-${material.id}-heading` : groupHeadingId}
        className="flex flex-col gap-4"
        style={{ gridColumn: "1 / -1" }}
      >
        {showHeading && (
          <h2 id={`monthly-material-${material.id}-heading`} className="text-lg font-semibold">
            {heading}
          </h2>
        )}
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
    <section
      aria-labelledby={showHeading ? `monthly-material-${material.id}-heading` : groupHeadingId}
      className="flex flex-col gap-3"
    >
      {(showHeading || editable) && (
        <div className="flex items-center justify-between">
          {showHeading && (
            <h2 id={`monthly-material-${material.id}-heading`} className="text-lg font-semibold">
              {heading}
            </h2>
          )}
          {editable && (
            <Button type="button" variant="outline" onClick={() => setMode("edit")}>
              {editButtonLabel}
            </Button>
          )}
        </div>
      )}
      <div>
        <Badge variant="other">{departmentLabel}</Badge>
      </div>
      <Dialog>
        <div className="flex flex-col gap-2">
          {material.sourceType === "upload" && (
            <p className="text-sm font-medium text-foreground">{material.fileName}</p>
          )}
          <div className="group relative">
            {compactPreview}
            <DialogTrigger asChild>
              <button
                type="button"
                className="absolute inset-0 flex items-center justify-center rounded-md bg-background/0 transition-colors hover:bg-background/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="rounded-md bg-background/90 px-3 py-1.5 text-sm font-medium opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  {viewerLabels.expandButtonLabel}
                </span>
              </button>
            </DialogTrigger>
          </div>
        </div>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
          </DialogHeader>
          {preview}
        </DialogContent>
      </Dialog>
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
