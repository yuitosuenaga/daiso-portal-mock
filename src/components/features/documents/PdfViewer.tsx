export interface PdfViewerProps {
  dataUrl: string;
  /** iframeのtitle属性（スクリーンリーダー等の支援技術向けのアクセシブルな名前） */
  title: string;
  downloadFileName: string;
  downloadLinkLabel: string;
}

/**
 * 追加のライブラリを導入せず、ブラウザネイティブの`<iframe>`でPDFを表示するビューア。
 * `<embed>`はフォールバック手段を持たないため採用しない。ダウンロードリンクはiframeの
 * フォールバックではなく、iframeの外側に常設する独立した導線として提供する（data URLは
 * iframeの読み込み失敗を検知できないため）。
 */
export function PdfViewer({
  dataUrl,
  title,
  downloadFileName,
  downloadLinkLabel,
}: PdfViewerProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-[50vh] min-h-[360px] w-full overflow-hidden rounded-md border border-input">
        <iframe src={dataUrl} title={title} className="h-full w-full" />
      </div>
      <a
        href={dataUrl}
        download={downloadFileName}
        className="inline-flex w-fit items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        {downloadLinkLabel}
      </a>
    </div>
  );
}
