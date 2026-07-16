import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatFileSize } from "@/lib/attachment-utils";
import { PdfViewer } from "@/components/features/documents/PdfViewer";
import type { Document } from "@/types/document";

export interface DocumentListItemProps {
  document: Document;
  locale: string;
  downloadLinkLabel: string;
  openOriginalLinkLabel: string;
}

export function DocumentListItem({
  document,
  locale,
  downloadLinkLabel,
  openOriginalLinkLabel,
}: DocumentListItemProps) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">{document.title}</CardTitle>
        {document.description && (
          <p className="text-sm text-muted-foreground">{document.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {document.sourceType === "upload" && (
            <span>{formatFileSize(document.fileSize)}</span>
          )}
          <time dateTime={document.uploadedAt}>
            {new Date(document.uploadedAt).toLocaleDateString(locale, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </time>
        </div>
      </CardHeader>
      <CardContent>
        {document.sourceType === "google" ? (
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
        )}
      </CardContent>
    </Card>
  );
}
