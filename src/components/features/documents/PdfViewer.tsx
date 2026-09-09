"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * フレームの表示サイズ。省略時は`"default"`（既存呼び出し元との後方互換）。
 * `"compact"`はサムネイル用の小さい固定高で、ダウンロードリンク・元ドキュメントを開くリンク・
 * 補助案内文を描画しない（拡大表示側で改めて`"default"`として描画することを想定）。
 */
export type PdfViewerSize = "default" | "compact";

export type PdfViewerProps =
  | {
      variant: "upload";
      dataUrl: string;
      /** iframeのtitle属性（スクリーンリーダー等の支援技術向けのアクセシブルな名前） */
      title: string;
      downloadFileName: string;
      downloadLinkLabel: string;
      /** ブラウザ標準のPDFビューア（iframe内）が独自のダウンロードボタンを持つ場合に、重複するダウンロードリンクを非表示にする。省略時はfalse（常に表示、既存呼び出し元との後方互換）。 */
      hideDownloadLink?: boolean;
      size?: PdfViewerSize;
    }
  | {
      variant: "google";
      embedUrl: string;
      /** iframeのtitle属性（スクリーンリーダー等の支援技術向けのアクセシブルな名前） */
      title: string;
      originalUrl: string;
      openOriginalLabel: string;
      /**
       * iframeのerrorイベント検知時にプレビューへ代えて表示するメッセージ。
       * 省略時（`documents`spec以外の既存呼び出し元との後方互換のため任意）は
       * フォールバックUIを描画せず、従来通り常にiframeを表示する。
       */
      previewErrorMessage?: string;
      /** プレビュー成否によらず常時表示する補助案内文（クロスオリジンで検知できない失敗への対応）。省略可。 */
      previewHint?: string;
      size?: PdfViewerSize;
    };

interface GooglePreviewFrameProps {
  embedUrl: string;
  title: string;
  onError: () => void;
}

/**
 * Google埋め込み用の`<iframe>`本体。Reactの合成イベント系は`<iframe>`要素に対して
 * `error`イベントの委譲リスナーを登録しない（`load`のみ）ため、Reactの`onError`propは
 * 発火しない。そのためネイティブの`addEventListener("error", ...)`をrefで直接登録する。
 */
function GooglePreviewFrame({ embedUrl, title, onError }: GooglePreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }
    iframe.addEventListener("error", onError);
    return () => {
      iframe.removeEventListener("error", onError);
    };
  }, [onError]);

  return (
    <iframe
      ref={iframeRef}
      src={embedUrl}
      title={title}
      loading="lazy"
      className="h-full w-full"
    />
  );
}

/**
 * 追加のライブラリを導入せず、ブラウザネイティブの`<iframe>`でPDFまたはGoogleドキュメントの
 * 埋め込みプレビューを表示するビューア。`<embed>`はフォールバック手段を持たないため採用しない。
 * `variant: "upload"`はアップロードされたPDFのdata URLを表示し、iframeの外側に独立した
 * ダウンロードリンクを常設する（data URLはiframeの読み込み失敗を検知できないため、フォール
 * バックではなく独立した導線として提供する）。`variant: "google"`はGoogleドキュメント/
 * スプレッドシート/スライドの埋め込み用URLを表示し、実ファイルの直接ダウンロードは提供できない
 * ため、ダウンロードリンクの代わりに元の共有リンクを新しいタブで開くリンクを常設する。
 * 両バリアントのiframeには、ビューポート外での即時描画を避けるため`loading="lazy"`を付与する。
 * Google方式は共有リンク失効・権限不足時にiframeの`error`イベントで検知できる場合は
 * フォールバックメッセージ＋元リンクへ切り替え、クロスオリジンでエラーページがそのまま描画され
 * `error`が発火しないケースに備え、プレビュー成否によらず常時、補助案内文＋元リンクを表示する。
 */
export function PdfViewer(props: PdfViewerProps) {
  const [hasError, setHasError] = useState(false);
  const canShowFallback =
    props.variant === "google" && Boolean(props.previewErrorMessage);

  // canShowFallbackのみに依存させ、GooglePreviewFrame側のuseEffectが
  // 再レンダーのたびにネイティブerrorリスナーを付け替えないようにする。
  const handleFrameError = useCallback(() => {
    if (canShowFallback) {
      setHasError(true);
    }
  }, [canShowFallback]);

  const isCompact = props.size === "compact";
  const frameClassName = isCompact
    ? "h-48 w-full overflow-hidden rounded-md border border-input"
    : "h-[50vh] min-h-[360px] w-full overflow-hidden rounded-md border border-input";

  if (props.variant === "google") {
    const previewErrorMessage = props.previewErrorMessage;
    const previewHint = props.previewHint;

    return (
      <div className="flex flex-col gap-3">
        <div className={frameClassName}>
          {hasError && canShowFallback ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {previewErrorMessage}
              </p>
              <a
                href={props.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                {props.openOriginalLabel}
              </a>
            </div>
          ) : (
            <GooglePreviewFrame
              embedUrl={props.embedUrl}
              title={props.title}
              onError={handleFrameError}
            />
          )}
        </div>
        {!isCompact && previewHint && (
          <p className="text-xs text-muted-foreground">{previewHint}</p>
        )}
        {!isCompact && (
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

  return (
    <div className="flex flex-col gap-3">
      <div className={frameClassName}>
        <iframe
          src={props.dataUrl}
          title={props.title}
          loading="lazy"
          className="h-full w-full"
        />
      </div>
      {!isCompact && !props.hideDownloadLink && (
        <a
          href={props.dataUrl}
          download={props.downloadFileName}
          className="inline-flex w-fit items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          {props.downloadLinkLabel}
        </a>
      )}
    </div>
  );
}
