import { getTranslations, getLocale } from "next-intl/server";
import { getDocumentsByCategory } from "@/lib/api/documents";
import { getVisibleDocumentCategory } from "@/lib/api/document-categories";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BackLink } from "@/components/ui/back-link";
import { DocumentListClient } from "@/components/features/documents/DocumentListClient";
import type { Document } from "@/types/document";
import type { DocumentCategoryDetail } from "@/types/document-category";

export interface DocumentListProps {
  /** 表示対象の大分類ID（要件21.1） */
  categoryId: string;
}

/**
 * 指定された大分類配下のドキュメント一覧（要件21）。従来の「自社可視の全ドキュメント
 * 一覧」から役割を変更し、大分類の可視性チェック・カテゴリ名の見出し・トップページへの
 * 戻る導線を追加する。
 */
export async function DocumentList({ categoryId }: DocumentListProps) {
  const [t, tCategory, locale] = await Promise.all([
    getTranslations("documents.list"),
    getTranslations("documents.category"),
    getLocale(),
  ]);

  const backLink = (
    <BackLink
      href="/documents"
      label={tCategory("backToCategories")}
      className="mb-4 inline-flex"
    />
  );

  let category: DocumentCategoryDetail | null;
  let documents: Document[];
  try {
    [category, documents] = await Promise.all([
      getVisibleDocumentCategory(categoryId, { locale }),
      getDocumentsByCategory(categoryId, { locale }),
    ]);
  } catch {
    return (
      <div>
        <div className="mb-6">{backLink}</div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("error")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!category) {
    return (
      <div>
        <div className="mb-6">{backLink}</div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {tCategory("notFound")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const heading = (
    <div className="mb-6">
      {backLink}
      <h1 className="text-2xl font-semibold text-foreground">
        {category.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
    </div>
  );

  if (documents.length === 0) {
    return (
      <div>
        {heading}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {heading}
      <DocumentListClient
        documents={documents}
        subCategories={category.subCategories}
        locale={locale}
        downloadLinkLabel={t("downloadLink")}
        openOriginalLinkLabel={t("openOriginalLink")}
        newBadgeLabel={t("newBadge")}
        googlePreviewErrorMessage={t("googlePreviewError")}
        googlePreviewHint={t("googlePreviewHint")}
      />
    </div>
  );
}

export function DocumentListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}
