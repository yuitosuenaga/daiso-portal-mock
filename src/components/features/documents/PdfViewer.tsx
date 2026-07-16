export type PdfViewerProps =
  | {
      variant: "upload";
      dataUrl: string;
      /** iframeのtitle属性（スクリーンリーダー等の支援技術向けのアクセシブルな名前） */
      title: string;
      downloadFileName: string;
      downloadLinkLabel: string;
    }
  | {
      variant: "google";
      embedUrl: string;
      /** iframeのtitle属性（スクリーンリーダー等の支援技術向けのアクセシブルな名前） */
      title: string;
      originalUrl: string;
      openOriginalLabel: string;
    };

/**
 * 追加のライブラリを導入せず、ブラウザネイティブの`<iframe>`でPDFまたはGoogleドキュメントの
 * 埋め込みプレビューを表示するビューア。`<embed>`はフォールバック手段を持たないため採用しない。
 * `variant: "upload"`はアップロードされたPDFのdata URLを表示し、iframeの外側に独立した
 * ダウンロードリンクを常設する（data URLはiframeの読み込み失敗を検知できないため、フォール
 * バックではなく独立した導線として提供する）。`variant: "google"`はGoogleドキュメント/
 * スプレッドシート/スライドの埋め込み用URLを表示し、実ファイルの直接ダウンロードは提供できない
 * ため、ダウンロードリンクの代わりに元の共有リンクを新しいタブで開くリンクを常設する。
 */
export function PdfViewer(props: PdfViewerProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-[50vh] min-h-[360px] w-full overflow-hidden rounded-md border border-input">
        <iframe
          src={props.variant === "upload" ? props.dataUrl : props.embedUrl}
          title={props.title}
          className="h-full w-full"
        />
      </div>
      {props.variant === "upload" ? (
        <a
          href={props.dataUrl}
          download={props.downloadFileName}
          className="inline-flex w-fit items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          {props.downloadLinkLabel}
        </a>
      ) : (
        <a
          href={props.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          {props.openOriginalLabel}
        </a>
      )}
    </div>
  );
}
