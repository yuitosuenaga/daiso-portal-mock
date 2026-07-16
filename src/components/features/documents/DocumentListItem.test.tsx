import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DocumentListItem } from "@/components/features/documents/DocumentListItem";
import type { Document } from "@/types/document";

const DOCUMENT: Document = {
  id: "1",
  title: "テストドキュメント",
  description: "テスト用の説明文",
  sourceType: "upload",
  fileName: "test.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
  dataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
  targeting: { scope: "all" },
  uploadedAt: "2026-07-01T09:00:00Z",
};

const GOOGLE_DOCUMENT: Document = {
  id: "2",
  title: "Googleドキュメント",
  description: "Google経由の説明文",
  sourceType: "google",
  googleUrl: "https://docs.google.com/document/d/abc123/edit",
  googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
  targeting: { scope: "all" },
  uploadedAt: "2026-07-02T09:00:00Z",
};

describe("DocumentListItem", () => {
  it("クリック操作なしでタイトル・説明・PDFプレビュー・ダウンロードリンクを表示する", () => {
    render(
      <DocumentListItem
        document={DOCUMENT}
        locale="ja"
        downloadLinkLabel="ダウンロード"
        openOriginalLinkLabel="元のドキュメントを開く"
      />
    );

    expect(screen.getByText("テストドキュメント")).toBeTruthy();
    expect(screen.getByText("テスト用の説明文")).toBeTruthy();

    const iframe = screen.getByTitle("テストドキュメント");
    expect(iframe.getAttribute("src")).toBe(DOCUMENT.dataUrl);

    const downloadLink = screen.getByText("ダウンロード");
    expect(downloadLink.getAttribute("href")).toBe(DOCUMENT.dataUrl);
    expect(downloadLink.getAttribute("download")).toBe(DOCUMENT.fileName);
  });

  it("説明文が未設定の場合は説明文を表示しない", () => {
    const documentWithoutDescription = { ...DOCUMENT, description: undefined };
    render(
      <DocumentListItem
        document={documentWithoutDescription}
        locale="ja"
        downloadLinkLabel="ダウンロード"
        openOriginalLinkLabel="元のドキュメントを開く"
      />
    );

    expect(screen.queryByText("テスト用の説明文")).toBeNull();
  });

  it("sourceTypeがgoogleのとき、埋め込みURLをプレビューし元のドキュメントを開くリンクを表示する", () => {
    render(
      <DocumentListItem
        document={GOOGLE_DOCUMENT}
        locale="ja"
        downloadLinkLabel="ダウンロード"
        openOriginalLinkLabel="元のドキュメントを開く"
      />
    );

    const iframe = screen.getByTitle("Googleドキュメント");
    expect(iframe.getAttribute("src")).toBe(GOOGLE_DOCUMENT.googleEmbedUrl);

    const openOriginalLink = screen.getByText("元のドキュメントを開く");
    expect(openOriginalLink.getAttribute("href")).toBe(GOOGLE_DOCUMENT.googleUrl);
    expect(openOriginalLink.getAttribute("target")).toBe("_blank");
    expect(screen.queryByText("ダウンロード")).toBeNull();
  });

  it("sourceTypeがgoogleのときファイルサイズを表示しない", () => {
    render(
      <DocumentListItem
        document={GOOGLE_DOCUMENT}
        locale="ja"
        downloadLinkLabel="ダウンロード"
        openOriginalLinkLabel="元のドキュメントを開く"
      />
    );

    expect(screen.queryByText(/KB|MB|バイト/)).toBeNull();
  });
});
