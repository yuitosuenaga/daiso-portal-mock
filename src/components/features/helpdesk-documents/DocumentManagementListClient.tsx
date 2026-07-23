"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { filterDocuments, targetingLabel } from "@/lib/document-utils";
import type { TargetingLabelDictionary } from "@/lib/document-utils";
import { formatFileSize } from "@/lib/attachment-utils";
import { DOCUMENT_MANAGEMENT_PAGE_SIZE } from "@/lib/constants/document";
import { DeleteDocumentButton } from "@/components/features/helpdesk-documents/DeleteDocumentButton";
import {
  DocumentManagementFilterBar,
  type DocumentManagementFilters,
} from "@/components/features/helpdesk-documents/DocumentManagementFilterBar";
import { DocumentManagementPagination } from "@/components/features/helpdesk-documents/DocumentManagementPagination";
import {
  ManagementListCard,
  ManagementListRow,
  ManagementListRows,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { Document } from "@/types/document";

export interface DocumentManagementListClientProps {
  /** アップロード日降順で整列済みの全ドキュメント */
  documents: Document[];
  locale: string;
  listTitle: string;
  editLinkLabel: string;
  sourceTypeUploadBadgeLabel: string;
  sourceTypeGoogleBadgeLabel: string;
  targetingLabels: TargetingLabelDictionary;
}

const INITIAL_FILTERS: DocumentManagementFilters = {
  keyword: "",
  sourceType: "all",
  scope: "all",
};

/**
 * ドキュメント管理一覧のキーワード・登録方式・公開範囲種別の絞り込み状態と
 * ページネーション状態を保持し、絞り込み済み・ページ分割済みの一覧を描画するコンポーネント。
 * 申請者側`DocumentListClient`に相当する管理一覧版。
 */
export function DocumentManagementListClient({
  documents,
  locale,
  listTitle,
  editLinkLabel,
  sourceTypeUploadBadgeLabel,
  sourceTypeGoogleBadgeLabel,
  targetingLabels,
}: DocumentManagementListClientProps) {
  const t = useTranslations("helpdeskDocuments.list.filter");
  const tList = useTranslations("helpdeskDocuments.list");
  const [filters, setFilters] = useState<DocumentManagementFilters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);

  const filteredDocuments = useMemo(() => {
    const byKeyword = filterDocuments(documents, filters.keyword);
    return byKeyword.filter((document) => {
      const matchesSourceType =
        filters.sourceType === "all" || document.sourceType === filters.sourceType;
      const matchesScope =
        filters.scope === "all" ||
        (filters.scope === "all-scope" && document.targeting.scope === "all") ||
        (filters.scope === "countries" &&
          document.targeting.scope === "countries") ||
        (filters.scope === "companies" &&
          document.targeting.scope === "companies");
      return matchesSourceType && matchesScope;
    });
  }, [documents, filters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDocuments.length / DOCUMENT_MANAGEMENT_PAGE_SIZE)
  );
  const currentPage = Math.min(page, totalPages);
  const pagedDocuments = filteredDocuments.slice(
    (currentPage - 1) * DOCUMENT_MANAGEMENT_PAGE_SIZE,
    currentPage * DOCUMENT_MANAGEMENT_PAGE_SIZE
  );

  function handleFiltersChange(next: DocumentManagementFilters) {
    setFilters(next);
    setPage(1);
  }

  function handleClear() {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <DocumentManagementFilterBar
        filters={filters}
        onChange={handleFiltersChange}
        onClear={handleClear}
      />
      {filteredDocuments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <>
          <ManagementListCard title={listTitle}>
            <ManagementListRows>
              {pagedDocuments.map((document) => (
                <ManagementListRow key={document.id}>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{document.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded border border-input px-1.5 py-0.5">
                        {document.sourceType === "google"
                          ? sourceTypeGoogleBadgeLabel
                          : sourceTypeUploadBadgeLabel}
                      </span>
                      {document.sourceType === "upload" && (
                        <span>{formatFileSize(document.fileSize)}</span>
                      )}
                      <time dateTime={document.uploadedAt}>
                        {new Date(document.uploadedAt).toLocaleDateString(
                          locale,
                          { year: "numeric", month: "short", day: "numeric" }
                        )}
                      </time>
                      <span>{targetingLabel(document.targeting, targetingLabels)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/helpdesk/documents/${document.id}/edit`}
                      className="text-sm text-primary underline-offset-4 hover:underline"
                    >
                      {editLinkLabel}
                    </Link>
                    <DeleteDocumentButton
                      documentId={document.id}
                      title={document.title}
                      deleteButtonLabel={tList("deleteButton")}
                      confirmTitle={tList("deleteConfirmTitle")}
                      confirmMessage={tList("deleteConfirm", { title: document.title })}
                      confirmButtonLabel={tList("deleteConfirmButton")}
                      cancelButtonLabel={tList("deleteCancelButton")}
                      errorMessage={tList("deleteError")}
                    />
                  </div>
                </ManagementListRow>
              ))}
            </ManagementListRows>
          </ManagementListCard>
          <DocumentManagementPagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
