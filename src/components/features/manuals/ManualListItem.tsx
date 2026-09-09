import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PdfViewer } from "@/components/features/documents/PdfViewer";
import type { Manual } from "@/types/manual";

export interface ManualListItemProps {
  manual: Manual;
  categoryLabel: string;
  revisionLabel: string;
  downloadLinkLabel: string;
  openOriginalLinkLabel: string;
}

/**
 * マニュアル一覧の1件分の表示。`documents`specの`DocumentListItem`と同様、カード内に
 * `PdfViewer`（アップロード方式/Google方式いずれか）を埋め込んで表示する。
 * カテゴリ名・対象年月（改訂年月）をメタ情報として併記する。
 */
export function ManualListItem({
  manual,
  categoryLabel,
  revisionLabel,
  downloadLinkLabel,
  openOriginalLinkLabel,
}: ManualListItemProps) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">{manual.title}</CardTitle>
        {manual.description && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {manual.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{categoryLabel}</span>
          <span>
            {revisionLabel}: {manual.year}/{manual.month}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {manual.sourceType === "google" ? (
          <PdfViewer
            variant="google"
            embedUrl={manual.googleEmbedUrl}
            title={manual.title}
            originalUrl={manual.googleUrl}
            openOriginalLabel={openOriginalLinkLabel}
          />
        ) : (
          <PdfViewer
            variant="upload"
            dataUrl={manual.dataUrl}
            title={manual.title}
            downloadFileName={manual.fileName}
            downloadLinkLabel={downloadLinkLabel}
          />
        )}
      </CardContent>
    </Card>
  );
}
