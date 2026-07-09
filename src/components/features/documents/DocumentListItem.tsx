import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatFileSize } from "@/lib/attachment-utils";
import { PdfViewer } from "@/components/features/documents/PdfViewer";
import type { Document } from "@/types/document";

export interface DocumentListItemProps {
  document: Document;
  locale: string;
  downloadLinkLabel: string;
}

export function DocumentListItem({
  document,
  locale,
  downloadLinkLabel,
}: DocumentListItemProps) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">{document.title}</CardTitle>
        {document.description && (
          <p className="text-sm text-muted-foreground">{document.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(document.fileSize)}</span>
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
        <PdfViewer
          dataUrl={document.dataUrl}
          title={document.title}
          downloadFileName={document.fileName}
          downloadLinkLabel={downloadLinkLabel}
        />
      </CardContent>
    </Card>
  );
}
