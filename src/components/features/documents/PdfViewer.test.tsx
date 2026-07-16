import { render, screen } from "@testing-library/react";
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
      />
    );

    const iframe = screen.getByTitle("サンプルGoogleドキュメント");
    expect(iframe.getAttribute("src")).toBe(
      "https://docs.google.com/document/d/abc123/preview"
    );

    const link = screen.getByText("元のドキュメントを開く");
    expect(link.getAttribute("href")).toBe(
      "https://docs.google.com/document/d/abc123/edit"
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
