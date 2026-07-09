"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  targetingAllLabel: string;
  targetingCountriesLabel: string;
  targetingCompaniesLabel: string;
  countryLabels: Record<string, string>;
  companyLabels: Record<string, string>;
  deleteButtonLabel: string;
  deleteConfirmMessage: string;
  deleteErrorMessage: string;
  formProps: Omit<DocumentFormProps, "mode" | "documentId" | "defaultValues">;
}

function toFormDefaultValues(document: Document): DocumentFormValues {
  return {
    title: document.title,
    description: document.description ?? "",
    fileName: document.fileName,
    fileType: document.fileType,
    fileSize: document.fileSize,
    dataUrl: document.dataUrl,
    // `Document.targeting`はドメイン型として`string[]`だが、保存済みデータは常に
    // `documentFormSchema`で検証済みのため、フォームの厳密な型へ安全に絞り込める。
    targeting: document.targeting as DocumentFormValues["targeting"],
  };
}

/**
 * ヘルプデスク側の既存ドキュメント画面。通常時（表示モード）は読み取り専用の登録済み
 * 情報とPDFプレビューを直接表示し、「編集」ボタンでページ遷移なしに編集モード
 * （既存のDocumentForm + プレビュー）へ切り替える。
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
  targetingAllLabel,
  targetingCountriesLabel,
  targetingCompaniesLabel,
  countryLabels,
  companyLabels,
  deleteButtonLabel,
  deleteConfirmMessage,
  deleteErrorMessage,
  formProps,
}: DocumentDetailPanelProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const preview = (
    <PdfViewer
      dataUrl={document.dataUrl}
      title={document.title}
      downloadFileName={document.fileName}
      downloadLinkLabel={downloadLinkLabel}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          {mode === "view" ? detailTitleLabel : editTitleLabel}
        </h1>
        <DeleteDocumentButton
          documentId={document.id}
          deleteButtonLabel={deleteButtonLabel}
          confirmMessage={deleteConfirmMessage}
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
                <span>
                  {fileSizeLabel}: {formatFileSize(document.fileSize)}
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

      <Link
        href="/helpdesk/documents"
        className="inline-block text-sm text-primary underline-offset-4 hover:underline"
      >
        {backToListLabel}
      </Link>
    </div>
  );
}
