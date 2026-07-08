import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentList } from "@/components/features/documents/DocumentList";
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

const getDocumentsMock = vi.fn();

vi.mock("@/lib/api/documents", () => ({
  getDocuments: (...args: unknown[]) => getDocumentsMock(...args),
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
  title: "テストドキュメント",
  fileName: "test.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
  dataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
  targeting: { scope: "all" },
  uploadedAt: "2026-07-01T09:00:00Z",
};

describe("DocumentList", () => {
  it("ドキュメントが0件のとき空状態メッセージを表示する", async () => {
    getDocumentsMock.mockResolvedValueOnce([]);

    const jsx = await DocumentList();
    render(jsx);

    expect(screen.getByText("ドキュメントはありません")).toBeTruthy();
  });

  it("getDocumentsが例外をthrowしたときエラーメッセージを表示する", async () => {
    getDocumentsMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await DocumentList();
    render(jsx);

    expect(screen.getByText("ドキュメントの取得に失敗しました")).toBeTruthy();
  });

  it("取得成功時にドキュメント一覧と表示/ダウンロードリンクを表示する", async () => {
    getDocumentsMock.mockResolvedValueOnce([DOCUMENT]);

    const jsx = await DocumentList();
    render(jsx);

    expect(screen.getByText("テストドキュメント")).toBeTruthy();
    expect(screen.getByText("表示")).toBeTruthy();
    expect(screen.getByText("ダウンロード")).toBeTruthy();
  });
});
