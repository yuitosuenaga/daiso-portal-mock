"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { filterDocuments } from "@/lib/document-utils";
import { DocumentSearchBar } from "@/components/features/documents/DocumentSearchBar";
import { DocumentListItem } from "@/components/features/documents/DocumentListItem";
import type { Document } from "@/types/document";

export interface DocumentListClientProps {
  /** アップロード日降順で整列済みのドキュメント */
  documents: Document[];
  locale: string;
  downloadLinkLabel: string;
  openOriginalLinkLabel: string;
  newBadgeLabel: string;
  googlePreviewErrorMessage: string;
  googlePreviewHint: string;
}

/**
 * キーワード検索の状態を保持し、`DocumentSearchBar` と絞り込み済みの
 * 2列グリッド（`DocumentListItem`）をクライアント側で結線するコンポーネント。
 */
export function DocumentListClient({
  documents,
  locale,
  downloadLinkLabel,
  openOriginalLinkLabel,
  newBadgeLabel,
  googlePreviewErrorMessage,
  googlePreviewHint,
}: DocumentListClientProps) {
  const t = useTranslations("documents.search");
  const [keyword, setKeyword] = useState("");

  const filteredDocuments = useMemo(
    () => filterDocuments(documents, keyword),
    [documents, keyword]
  );

  return (
    <div className="space-y-4">
      <DocumentSearchBar
        keyword={keyword}
        onChange={setKeyword}
        onClear={() => setKeyword("")}
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
