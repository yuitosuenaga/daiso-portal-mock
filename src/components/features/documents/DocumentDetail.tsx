import { getTranslations, getLocale } from "next-intl/server";
import { getDocumentById } from "@/lib/api/documents";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { formatFileSize } from "@/lib/attachment-utils";
import { PdfViewer } from "@/components/features/documents/PdfViewer";

export async function DocumentDetail({ id }: { id: string }) {
  const [t, locale] = await Promise.all([
    getTranslations("documents.detail"),
    getLocale(),
  ]);

  const backToListLink = (
    <Link
      href="/documents"
      className="text-sm text-primary underline-offset-4 hover:underline"
    >
      {t("backToList")}
    </Link>
  );

  let document;
  try {
    document = await getDocumentById(id);
  } catch {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("error")}</p>
          </CardContent>
        </Card>
        {backToListLink}
      </div>
    );
  }

  if (!document) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("notFound")}</p>
          </CardContent>
        </Card>
        {backToListLink}
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
              {t("uploadedAtLabel")}:{" "}
              <time dateTime={document.uploadedAt}>
                {new Date(document.uploadedAt).toLocaleDateString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </span>
            <span>
              {t("fileSizeLabel")}: {formatFileSize(document.fileSize)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <PdfViewer
            dataUrl={document.dataUrl}
            title={document.title}
            downloadFileName={document.fileName}
            downloadLinkLabel={t("downloadLink")}
          />
        </CardContent>
      </Card>
      {backToListLink}
    </div>
  );
}

export function DocumentDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[60vh] w-full" />
        </CardContent>
      </Card>
      <Skeleton className="h-4 w-24" />
    </div>
  );
}
