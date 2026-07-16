import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentManagementList } from "@/components/features/helpdesk-documents/DocumentManagementList";
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
  useRouter: () => ({ push: vi.fn() }),
}));

const getAllDocumentsMock = vi.fn();

vi.mock("@/lib/api/documents", () => ({
  getAllDocuments: (...args: unknown[]) => getAllDocumentsMock(...args),
}));

vi.mock("@/lib/actions/documents", () => ({
  deleteDocumentAction: vi.fn(),
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
  sourceType: "google",
  googleUrl: "https://docs.google.com/document/d/abc123/edit",
  googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
  targeting: { scope: "all" },
  uploadedAt: "2026-07-02T09:00:00Z",
};

describe("DocumentManagementList", () => {
  it("ドキュメントが0件のとき空状態メッセージを表示する", async () => {
    getAllDocumentsMock.mockResolvedValueOnce([]);

    const jsx = await DocumentManagementList();
    render(jsx);

    expect(screen.getByText("ドキュメントはありません")).toBeTruthy();
  });

  it("getAllDocumentsが例外をthrowしたときエラーメッセージを表示する", async () => {
    getAllDocumentsMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await DocumentManagementList();
    render(jsx);

    expect(screen.getByText("ドキュメントの取得に失敗しました")).toBeTruthy();
  });

  it("取得成功時にドキュメント一覧を表示する", async () => {
    getAllDocumentsMock.mockResolvedValueOnce([DOCUMENT]);

    const jsx = await DocumentManagementList();
    render(jsx);

    expect(screen.getByText("テストドキュメント")).toBeTruthy();
    expect(screen.getByText("全体公開")).toBeTruthy();
    expect(screen.getByRole("link", { name: "新規ドキュメントを追加" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "編集" })).toBeTruthy();
  });

  it("sourceTypeに応じた登録方式バッジをそれぞれ表示する", async () => {
    getAllDocumentsMock.mockResolvedValueOnce([DOCUMENT, GOOGLE_DOCUMENT]);

    const jsx = await DocumentManagementList();
    render(jsx);

    expect(screen.getByText("アップロード")).toBeTruthy();
    expect(screen.getByText("Googleリンク")).toBeTruthy();
  });
});
