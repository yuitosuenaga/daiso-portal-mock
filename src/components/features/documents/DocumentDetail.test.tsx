import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentDetail } from "@/components/features/documents/DocumentDetail";
import type { Document } from "@/types/document";
import messages from "../../../../messages/ja.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const getDocumentByIdMock = vi.fn();

vi.mock("@/lib/api/documents", () => ({
  getDocumentById: (...args: unknown[]) => getDocumentByIdMock(...args),
}));

function resolveMessage(namespace: string, key: string): string {
  const segments = `${namespace}.${key}`.split(".");
  let value: unknown = messages;
  for (const segment of segments) {
    if (typeof value !== "object" || value === null) {
      return `${namespace}.${key}`;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return typeof value === "string" ? value : `${namespace}.${key}`;
}

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    (key: string) => resolveMessage(namespace, key),
  getLocale: async () => "ja",
}));

const DOCUMENT: Document = {
  id: "1",
  title: "テストドキュメント詳細",
  fileName: "test.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
  dataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
  targeting: { scope: "all" },
  uploadedAt: "2026-07-01T09:00:00Z",
};

describe("DocumentDetail", () => {
  it("getDocumentByIdがnullを返したとき見つからないメッセージを表示する", async () => {
    getDocumentByIdMock.mockResolvedValueOnce(null);

    const jsx = await DocumentDetail({ id: "not-exist" });
    render(jsx);

    expect(screen.getByText("ドキュメントが見つかりません")).toBeTruthy();
  });

  it("getDocumentByIdが例外をthrowしたときエラーメッセージを表示する", async () => {
    getDocumentByIdMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await DocumentDetail({ id: "1" });
    render(jsx);

    expect(screen.getByText("ドキュメントの取得に失敗しました")).toBeTruthy();
  });

  it("取得成功時にタイトルとPDF表示領域・ダウンロードリンクを表示する", async () => {
    getDocumentByIdMock.mockResolvedValueOnce(DOCUMENT);

    const jsx = await DocumentDetail({ id: "1" });
    render(jsx);

    expect(screen.getByText("テストドキュメント詳細")).toBeTruthy();
    const iframe = screen.getByTitle("テストドキュメント詳細");
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute("src")).toBe(DOCUMENT.dataUrl);
    expect(screen.getByText("ダウンロード")).toBeTruthy();
  });

  it("常に一覧へ戻るリンクを表示する", async () => {
    getDocumentByIdMock.mockResolvedValueOnce(null);

    const jsx = await DocumentDetail({ id: "not-exist" });
    render(jsx);

    expect(screen.getByText("一覧へ戻る")).toBeTruthy();
  });
});
