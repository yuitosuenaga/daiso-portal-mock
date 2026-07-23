"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/ui/back-link";
import { formatFileSize } from "@/lib/attachment-utils";
import { targetingLabel } from "@/lib/document-utils";
import { PdfViewer } from "@/components/features/documents/PdfViewer";
import {
  DocumentForm,
  type DocumentFormProps,
} from "@/components/features/helpdesk-documents/DocumentForm";
import { DeleteDocumentButton } from "@/components/features/helpdesk-documents/DeleteDocumentButton";
import type { Document } from "@/types/document";
import type { DocumentFormValues } from "@/lib/validation/document";

export interface DocumentDetailPanelProps {
  document: Document;
  locale: string;
  detailTitleLabel: string;
  editTitleLabel: string;
  editButtonLabel: string;
  cancelButtonLabel: string;
  backToListLabel: string;
  fileSizeLabel: string;
  uploadedAtLabel: string;
  downloadLinkLabel: string;
  openOriginalLinkLabel: string;
  sourceTypeLabel: string;
  sourceTypeUploadBadge: string;
  sourceTypeGoogleBadge: string;
  targetingAllLabel: string;
  targetingCountriesLabel: string;
  targetingCompaniesLabel: string;
  countryLabels: Record<string, string>;
  companyLabels: Record<string, string>;
  deleteButtonLabel: string;
  deleteConfirmTitle: string;
  deleteConfirmMessage: string;
  deleteConfirmButtonLabel: string;
  deleteCancelButtonLabel: string;
  deleteErrorMessage: string;
  formProps: Omit<DocumentFormProps, "mode" | "documentId" | "defaultValues">;
}

function toFormDefaultValues(document: Document): DocumentFormValues {
  if (document.sourceType === "google") {
    return {
      sourceType: "google",
      title: document.title,
      description: document.description ?? "",
      googleUrl: document.googleUrl,
      googleEmbedUrl: document.googleEmbedUrl,
      // `Document.targeting`はドメイン型として`string[]`だが、保存済みデータは常に
      // `documentFormSchema`で検証済みのため、フォームの厳密な型へ安全に絞り込める。
      targeting: document.targeting as DocumentFormValues["targeting"],
    };
  }

  return {
    sourceType: "upload",
    title: document.title,
    description: document.description ?? "",
    fileName: document.fileName,
    fileType: document.fileType,
    fileSize: document.fileSize,
    dataUrl: document.dataUrl,
    targeting: document.targeting as DocumentFormValues["targeting"],
  };
}

/**
 * ヘルプデスク側の既存ドキュメント画面。一覧から遷移した直後は編集モード
 * （既存のDocumentForm + PDFプレビュー）を直接表示する。「キャンセル」を押すと
 * 読み取り専用の登録済み情報とPDFプレビューを表示する表示モードに切り替わり、
 * 表示モードの「編集」ボタンでページ遷移なしに編集モードへ戻れる。
 */
export function DocumentDetailPanel({
  document,
  locale,
  detailTitleLabel,
  editTitleLabel,
  editButtonLabel,
  cancelButtonLabel,
  backToListLabel,
  fileSizeLabel,
  uploadedAtLabel,
  downloadLinkLabel,
  openOriginalLinkLabel,
  sourceTypeLabel,
  sourceTypeUploadBadge,
  sourceTypeGoogleBadge,
  targetingAllLabel,
  targetingCountriesLabel,
  targetingCompaniesLabel,
  countryLabels,
  companyLabels,
  deleteButtonLabel,
  deleteConfirmTitle,
  deleteConfirmMessage,
  deleteConfirmButtonLabel,
  deleteCancelButtonLabel,
  deleteErrorMessage,
  formProps,
}: DocumentDetailPanelProps) {
  const [mode, setMode] = useState<"view" | "edit">("edit");

  const preview =
    document.sourceType === "google" ? (
      <PdfViewer
        variant="google"
        embedUrl={document.googleEmbedUrl}
        title={document.title}
        originalUrl={document.googleUrl}
        openOriginalLabel={openOriginalLinkLabel}
      />
    ) : (
      <PdfViewer
        variant="upload"
        dataUrl={document.dataUrl}
        title={document.title}
        downloadFileName={document.fileName}
        downloadLinkLabel={downloadLinkLabel}
      />
    );

  return (
    <div className="space-y-4">
      <BackLink href="/helpdesk/documents" label={backToListLabel} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          {mode === "view" ? detailTitleLabel : editTitleLabel}
        </h1>
        <DeleteDocumentButton
          documentId={document.id}
          title={document.title}
          deleteButtonLabel={deleteButtonLabel}
          confirmTitle={deleteConfirmTitle}
          confirmMessage={deleteConfirmMessage}
          confirmButtonLabel={deleteConfirmButtonLabel}
          cancelButtonLabel={deleteCancelButtonLabel}
          errorMessage={deleteErrorMessage}
        />
      </div>

      {mode === "view" ? (
        <>
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle>{document.title}</CardTitle>
              {document.description && (
                <p className="text-sm text-muted-foreground">
                  {document.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {uploadedAtLabel}:{" "}
                  <time dateTime={document.uploadedAt}>
                    {new Date(document.uploadedAt).toLocaleDateString(locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </span>
                {document.sourceType === "upload" && (
                  <span>
                    {fileSizeLabel}: {formatFileSize(document.fileSize)}
                  </span>
                )}
                <span>
                  {sourceTypeLabel}:{" "}
                  {document.sourceType === "google"
                    ? sourceTypeGoogleBadge
                    : sourceTypeUploadBadge}
                </span>
                <span>
                  {targetingLabel(document.targeting, {
                    allLabel: targetingAllLabel,
                    countriesLabel: targetingCountriesLabel,
                    companiesLabel: targetingCompaniesLabel,
                    countryLabels,
                    companyLabels,
                  })}
                </span>
              </div>
            </CardHeader>
            <CardContent>{preview}</CardContent>
          </Card>
          <Button type="button" onClick={() => setMode("edit")}>
            {editButtonLabel}
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <DocumentForm
            mode="edit"
            documentId={document.id}
            defaultValues={toFormDefaultValues(document)}
            {...formProps}
          />
          {preview}
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode("view")}
          >
            {cancelButtonLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
