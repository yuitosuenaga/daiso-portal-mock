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

function resolveMessage(
  namespace: string,
  key: string,
  values?: Record<string, unknown>
): string {
  const segments = `${namespace}.${key}`.split(".");
  let value: unknown = messages;
  for (const segment of segments) {
    if (typeof value !== "object" || value === null) {
      return `${namespace}.${key}`;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  if (typeof value !== "string") {
    return `${namespace}.${key}`;
  }
  if (!values) {
    return value;
  }
  return value.replace(/\{(\w+)\}/g, (_, token: string) =>
    String(values[token] ?? `{${token}}`)
  );
}

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    (key: string) => resolveMessage(namespace, key),
  getLocale: async () => "ja",
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) =>
    (key: string, values?: Record<string, unknown>) =>
      resolveMessage(namespace, key, values),
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
    expect(screen.getAllByText("全体公開").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "新規ドキュメントを追加" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "編集" })).toBeTruthy();
  });

  it("sourceTypeに応じた登録方式バッジをそれぞれ表示する", async () => {
    getAllDocumentsMock.mockResolvedValueOnce([DOCUMENT, GOOGLE_DOCUMENT]);

    const jsx = await DocumentManagementList();
    render(jsx);

    expect(screen.getAllByText("アップロード").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Googleリンク").length).toBeGreaterThanOrEqual(1);
  });

  it("キーワードで絞り込むと一覧が即時に絞り込まれ、0件時はメッセージを表示する", async () => {
    const otherDocument: Document = {
      ...DOCUMENT,
      id: "2",
      title: "Onboarding Guide",
    };
    getAllDocumentsMock.mockResolvedValueOnce([DOCUMENT, otherDocument]);

    const jsx = await DocumentManagementList();
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(jsx);

    expect(screen.getByText("テストドキュメント")).toBeTruthy();
    expect(screen.getByText("Onboarding Guide")).toBeTruthy();

    await user.type(
      screen.getByLabelText("キーワード検索"),
      "存在しないキーワード"
    );

    expect(screen.getByText("該当するドキュメントがありません")).toBeTruthy();
    expect(screen.queryByText("テストドキュメント")).toBeNull();

    await user.click(screen.getByRole("button", { name: "条件をクリア" }));

    expect(screen.getByText("テストドキュメント")).toBeTruthy();
    expect(screen.getByText("Onboarding Guide")).toBeTruthy();
  });

  it("登録方式（sourceType）で絞り込める", async () => {
    getAllDocumentsMock.mockResolvedValueOnce([DOCUMENT, GOOGLE_DOCUMENT]);

    const jsx = await DocumentManagementList();
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(jsx);

    await user.selectOptions(
      screen.getByLabelText("登録方式"),
      "google"
    );

    expect(screen.getByText("Googleドキュメント")).toBeTruthy();
    expect(screen.queryByText("テストドキュメント")).toBeNull();
  });

  it("ページネーションで11件を超える一覧は10件ずつ表示される", async () => {
    const manyDocuments: Document[] = Array.from({ length: 11 }, (_, index) => ({
      ...DOCUMENT,
      id: `doc-${index}`,
      title: `ドキュメント${index}`,
      uploadedAt: new Date(2026, 6, 1 + index).toISOString(),
    }));
    getAllDocumentsMock.mockResolvedValueOnce(manyDocuments);

    const jsx = await DocumentManagementList();
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(jsx);

    expect(screen.getByText("ドキュメント0")).toBeTruthy();
    expect(screen.queryByText("ドキュメント10")).toBeNull();

    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByText("ドキュメント10")).toBeTruthy();
  });
});
