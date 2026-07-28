"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { filterDocuments } from "@/lib/document-utils";
import { DocumentSearchBar } from "@/components/features/documents/DocumentSearchBar";
import { DocumentListItem } from "@/components/features/documents/DocumentListItem";
import type { Document } from "@/types/document";
import type { DocumentSubCategoryOption } from "@/types/document-category";

/** 中分類の絞り込み未選択（「すべての中分類」）を表す値。 */
export const DOCUMENT_SUB_CATEGORY_FILTER_ALL = "";

export interface DocumentListClientProps {
  /** アップロード日降順で整列済みのドキュメント */
  documents: Document[];
  /** 当該大分類配下で自社に公開されている中分類（displayOrder昇順、要件21.5） */
  subCategories: DocumentSubCategoryOption[];
  locale: string;
  downloadLinkLabel: string;
  openOriginalLinkLabel: string;
  newBadgeLabel: string;
  googlePreviewErrorMessage: string;
  googlePreviewHint: string;
}

/**
 * キーワード検索・中分類絞り込みの状態を保持し、`DocumentSearchBar` と絞り込み済みの
 * 2列グリッド（`DocumentListItem`）をクライアント側で結線するコンポーネント。
 * 中分類の絞り込みはキーワード検索と同じくクライアント側の即時フィルタとし、
 * サーバー再取得は行わない（要件21.8）。
 */
export function DocumentListClient({
  documents,
  subCategories,
  locale,
  downloadLinkLabel,
  openOriginalLinkLabel,
  newBadgeLabel,
  googlePreviewErrorMessage,
  googlePreviewHint,
}: DocumentListClientProps) {
  const t = useTranslations("documents.search");
  const [keyword, setKeyword] = useState("");
  const [subCategoryId, setSubCategoryId] = useState(
    DOCUMENT_SUB_CATEGORY_FILTER_ALL
  );

  const filteredDocuments = useMemo(() => {
    const byKeyword = filterDocuments(documents, keyword);
    if (subCategoryId === DOCUMENT_SUB_CATEGORY_FILTER_ALL) {
      return byKeyword;
    }
    return byKeyword.filter(
      (document) => document.subCategoryId === subCategoryId
    );
  }, [documents, keyword, subCategoryId]);

  function handleClear() {
    setKeyword("");
    setSubCategoryId(DOCUMENT_SUB_CATEGORY_FILTER_ALL);
  }

  return (
    <div className="space-y-4">
      <DocumentSearchBar
        keyword={keyword}
        onChange={setKeyword}
        subCategories={subCategories}
        subCategoryId={subCategoryId}
        onSubCategoryChange={setSubCategoryId}
        onClear={handleClear}
      />
      {filteredDocuments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredDocuments.map((document) => (
            <DocumentListItem
              key={document.id}
              document={document}
              locale={locale}
              downloadLinkLabel={downloadLinkLabel}
              openOriginalLinkLabel={openOriginalLinkLabel}
              newBadgeLabel={newBadgeLabel}
              googlePreviewErrorMessage={googlePreviewErrorMessage}
              googlePreviewHint={googlePreviewHint}
            />
          ))}
        </div>
      )}
    </div>
  );
}
