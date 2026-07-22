import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PdfViewer } from "@/components/features/documents/PdfViewer";

describe("PdfViewer", () => {
  it("variant: uploadのときdataUrlをiframeのsrcに設定し、ダウンロードリンクを表示する", () => {
    render(
      <PdfViewer
        variant="upload"
        dataUrl="data:application/pdf;base64,AAAA"
        title="サンプルPDF"
        downloadFileName="sample.pdf"
        downloadLinkLabel="ダウンロード"
      />
    );

    const iframe = screen.getByTitle("サンプルPDF");
    expect(iframe.getAttribute("src")).toBe("data:application/pdf;base64,AAAA");
    expect(iframe.getAttribute("loading")).toBe("lazy");

    const link = screen.getByText("ダウンロード");
    expect(link.getAttribute("href")).toBe("data:application/pdf;base64,AAAA");
    expect(link.getAttribute("download")).toBe("sample.pdf");
  });

  it("variant: googleのとき埋め込みURLをiframeのsrcに設定し、元のドキュメントを開くリンクを表示する", () => {
    render(
      <PdfViewer
        variant="google"
        embedUrl="https://docs.google.com/document/d/abc123/preview"
        title="サンプルGoogleドキュメント"
        originalUrl="https://docs.google.com/document/d/abc123/edit"
        openOriginalLabel="元のドキュメントを開く"
        previewErrorMessage="プレビューを表示できませんでした"
        previewHint="プレビューが表示されない場合は、元のドキュメントを開いてください"
      />
    );

    const iframe = screen.getByTitle("サンプルGoogleドキュメント");
    expect(iframe.getAttribute("src")).toBe(
      "https://docs.google.com/document/d/abc123/preview"
    );
    expect(iframe.getAttribute("loading")).toBe("lazy");

    const link = screen.getByText("元のドキュメントを開く");
    expect(link.getAttribute("href")).toBe(
      "https://docs.google.com/document/d/abc123/edit"
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("variant: googleのとき、プレビュー成否によらず常時、補助案内文を表示する", () => {
    render(
      <PdfViewer
        variant="google"
        embedUrl="https://docs.google.com/document/d/abc123/preview"
        title="サンプルGoogleドキュメント"
        originalUrl="https://docs.google.com/document/d/abc123/edit"
        openOriginalLabel="元のドキュメントを開く"
        previewErrorMessage="プレビューを表示できませんでした"
        previewHint="プレビューが表示されない場合は、元のドキュメントを開いてください"
      />
    );

    expect(
      screen.getByText("プレビューが表示されない場合は、元のドキュメントを開いてください")
    ).toBeTruthy();
  });

  it("variant: googleのiframeでerrorイベントが発火したとき、フォールバックメッセージと元リンクを表示する", () => {
    render(
      <PdfViewer
        variant="google"
        embedUrl="https://docs.google.com/document/d/abc123/preview"
        title="サンプルGoogleドキュメント"
        originalUrl="https://docs.google.com/document/d/abc123/edit"
        openOriginalLabel="元のドキュメントを開く"
        previewErrorMessage="プレビューを表示できませんでした"
        previewHint="プレビューが表示されない場合は、元のドキュメントを開いてください"
      />
    );

    const iframe = screen.getByTitle("サンプルGoogleドキュメント");
    fireEvent.error(iframe);

    expect(screen.queryByTitle("サンプルGoogleドキュメント")).toBeNull();
    expect(screen.getByText("プレビューを表示できませんでした")).toBeTruthy();
    expect(screen.getAllByText("元のドキュメントを開く").length).toBeGreaterThanOrEqual(1);
  });

  it("variant: uploadのときはフォールバックUIを持たない（常時プレビューを描画する）", () => {
    render(
      <PdfViewer
        variant="upload"
        dataUrl="data:application/pdf;base64,AAAA"
        title="サンプルPDF"
        downloadFileName="sample.pdf"
        downloadLinkLabel="ダウンロード"
      />
    );

    expect(screen.getByTitle("サンプルPDF")).toBeTruthy();
    expect(screen.queryByText("プレビューを表示できませんでした")).toBeNull();
  });
});
