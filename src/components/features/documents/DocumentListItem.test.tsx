import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DocumentListItem } from "@/components/features/documents/DocumentListItem";
import type { Document } from "@/types/document";

const DOCUMENT: Document = {
  id: "1",
  title: "テストドキュメント",
  description: "テスト用の説明文",
  fileName: "test.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
  dataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
  targeting: { scope: "all" },
  uploadedAt: "2026-07-01T09:00:00Z",
};

describe("DocumentListItem", () => {
  it("クリック操作なしでタイトル・説明・PDFプレビュー・ダウンロードリンクを表示する", () => {
    render(
      <DocumentListItem
        document={DOCUMENT}
        locale="ja"
        downloadLinkLabel="ダウンロード"
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
      />
    );

    expect(screen.queryByText("テスト用の説明文")).toBeNull();
  });
});
