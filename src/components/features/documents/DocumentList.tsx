import { getTranslations, getLocale } from "next-intl/server";
import { getDocuments } from "@/lib/api/documents";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentListClient } from "@/components/features/documents/DocumentListClient";
import type { Document } from "@/types/document";

export async function DocumentList() {
  const [t, locale] = await Promise.all([
    getTranslations("documents.list"),
    getLocale(),
  ]);

  const heading = (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
    </div>
  );

  let documents: Document[];
  try {
    documents = await getDocuments();
  } catch {
    return (
      <div>
        {heading}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("error")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
