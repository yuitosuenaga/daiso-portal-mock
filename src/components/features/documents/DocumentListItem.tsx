import { Link } from "@/i18n/navigation";
import { formatFileSize } from "@/lib/attachment-utils";
import type { Document } from "@/types/document";

export interface DocumentListItemProps {
  document: Document;
  locale: string;
  viewLinkLabel: string;
  downloadLinkLabel: string;
}

export function DocumentListItem({
  document,
  locale,
  viewLinkLabel,
  downloadLinkLabel,
}: DocumentListItemProps) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{document.title}</p>
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
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href={`/documents/${document.id}`}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {viewLinkLabel}
        </Link>
        <a
          href={document.dataUrl}
          download={document.fileName}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {downloadLinkLabel}
        </a>
      </div>
    </li>
  );
}
