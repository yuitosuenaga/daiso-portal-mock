import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentList } from "@/components/features/documents/DocumentList";
import type { DocumentSummary } from "@/types/document";
import type { DocumentCategoryDetail } from "@/types/document-category";
import messages from "../../../../messages/ja.json";

const getDocumentsByCategoryMock = vi.fn();
const getVisibleDocumentCategoryMock = vi.fn();

vi.mock("@/lib/api/documents", () => ({
  getDocumentsByCategory: (...args: unknown[]) =>
    getDocumentsByCategoryMock(...args),
}));

vi.mock("@/lib/api/document-categories", () => ({
  getVisibleDocumentCategory: (...args: unknown[]) =>
    getVisibleDocumentCategoryMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
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

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) =>
    (key: string) => resolveMessage(namespace, key),
}));

const CATEGORY: DocumentCategoryDetail = {
  id: "cat-1",
  name: "規程・マニュアル",
  subCategories: [],
};

const DOCUMENT: DocumentSummary = {
  id: "1",
  title: "テストドキュメント",
  sourceType: "upload",
  status: "published",
  fileName: "test.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
  targeting: { scope: "all" },
  uploadedAt: "2026-07-01T09:00:00Z",
  translations: [],
  categoryId: "cat-1",
  subCategoryId: null,
};

import { logLoadFailure } from "@/lib/server/load-failure";

vi.mock("@/lib/server/load-failure", () => ({ logLoadFailure: vi.fn() }));

describe("DocumentList", () => {
  it("getVisibleDocumentCategory・getDocumentsByCategoryへcategoryIdと選択中のロケールを渡す", async () => {
    getVisibleDocumentCategoryMock.mockResolvedValueOnce(CATEGORY);
    getDocumentsByCategoryMock.mockResolvedValueOnce([]);

    await DocumentList({ categoryId: "cat-1" });

    expect(getVisibleDocumentCategoryMock).toHaveBeenCalledWith("cat-1", {
      locale: "ja",
    });
    expect(getDocumentsByCategoryMock).toHaveBeenCalledWith("cat-1", {
      locale: "ja",
    });
  });

  it("カテゴリ名をh1に表示する", async () => {
    getVisibleDocumentCategoryMock.mockResolvedValueOnce(CATEGORY);
    getDocumentsByCategoryMock.mockResolvedValueOnce([DOCUMENT]);

    const jsx = await DocumentList({ categoryId: "cat-1" });
    render(jsx);

    expect(
      screen.getByRole("heading", { level: 1, name: "規程・マニュアル" })
    ).toBeTruthy();
  });

  it("getVisibleDocumentCategoryがnullのとき「見つからない」旨を表示する", async () => {
    getVisibleDocumentCategoryMock.mockResolvedValueOnce(null);
    getDocumentsByCategoryMock.mockResolvedValueOnce([]);

    const jsx = await DocumentList({ categoryId: "unknown" });
    render(jsx);

    expect(
      screen.getByText("ドキュメントが見つかりませんでした")
    ).toBeTruthy();
  });

  it("ドキュメントが0件のとき空状態メッセージを表示する", async () => {
    getVisibleDocumentCategoryMock.mockResolvedValueOnce(CATEGORY);
    getDocumentsByCategoryMock.mockResolvedValueOnce([]);

    const jsx = await DocumentList({ categoryId: "cat-1" });
    render(jsx);

    expect(screen.getByText("ドキュメントはありません")).toBeTruthy();
  });

  it("取得が例外をthrowしたときエラーメッセージを表示する", async () => {
    getVisibleDocumentCategoryMock.mockRejectedValueOnce(new Error("network error"));
    getDocumentsByCategoryMock.mockResolvedValueOnce([]);

    const jsx = await DocumentList({ categoryId: "cat-1" });
    render(jsx);

    expect(screen.getByText("ドキュメントの取得に失敗しました")).toBeTruthy();

    expect(logLoadFailure).toHaveBeenCalledWith("DocumentList", expect.any(Error));
  });

  it("取得成功時にドキュメント一覧をクリック操作なしでプレビュー付きで表示する", async () => {
    getVisibleDocumentCategoryMock.mockResolvedValueOnce(CATEGORY);
    getDocumentsByCategoryMock.mockResolvedValueOnce([DOCUMENT]);

    const jsx = await DocumentList({ categoryId: "cat-1" });
    render(jsx);

    expect(screen.getByText("テストドキュメント")).toBeTruthy();
    const iframe = screen.getByTitle("テストドキュメント");
    expect(iframe.getAttribute("src")).toBe("/api/documents/1/file");
    expect(screen.getByText("ダウンロード").getAttribute("href")).toBe(
      "/api/documents/1/file?download=1"
    );
  });

  it("DocumentListClientへ渡るpropsとレンダリング結果にファイル本体(dataUrl)を含めない", async () => {
    getVisibleDocumentCategoryMock.mockResolvedValueOnce(CATEGORY);
    getDocumentsByCategoryMock.mockResolvedValueOnce([DOCUMENT]);

    const jsx = await DocumentList({ categoryId: "cat-1" });
    const clientElement = (
      jsx.props.children as { props?: { documents?: unknown[] } }[]
    ).find((child) => child?.props?.documents);
    expect(clientElement?.props?.documents).toHaveLength(1);
    for (const doc of clientElement?.props?.documents ?? []) {
      expect(doc).not.toHaveProperty("dataUrl");
    }

    const { container } = render(jsx);
    expect(container.innerHTML).not.toContain("data:application/pdf");
  });

  it("キーワードで絞り込むと一覧が即時に絞り込まれ、0件時はメッセージを表示する", async () => {
    const otherDocument: DocumentSummary = {
      ...DOCUMENT,
      id: "2",
      title: "Onboarding Guide",
    };
    getVisibleDocumentCategoryMock.mockResolvedValueOnce(CATEGORY);
    getDocumentsByCategoryMock.mockResolvedValueOnce([DOCUMENT, otherDocument]);

    const jsx = await DocumentList({ categoryId: "cat-1" });
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

  it("sourceTypeがupload/googleで混在していても両方をプレビュー付きで表示する", async () => {
    const googleDocument: DocumentSummary = {
      id: "2",
      title: "Google経由のドキュメント",
      sourceType: "google",
      status: "published",
      googleUrl: "https://docs.google.com/document/d/abc123/edit",
      googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
      targeting: { scope: "all" },
      uploadedAt: "2026-07-02T09:00:00Z",
      translations: [],
      categoryId: "cat-1",
      subCategoryId: null,
    };
    getVisibleDocumentCategoryMock.mockResolvedValueOnce(CATEGORY);
    getDocumentsByCategoryMock.mockResolvedValueOnce([DOCUMENT, googleDocument]);

    const jsx = await DocumentList({ categoryId: "cat-1" });
    render(jsx);

    const uploadIframe = screen.getByTitle("テストドキュメント");
    expect(uploadIframe.getAttribute("src")).toBe("/api/documents/1/file");
    expect(screen.getByText("ダウンロード")).toBeTruthy();

    const googleIframe = screen.getByTitle("Google経由のドキュメント");
    expect(googleIframe.getAttribute("src")).toBe(googleDocument.googleEmbedUrl);
    expect(screen.getByText("元のドキュメントを開く")).toBeTruthy();
  });

  it("中分類の絞り込みセレクトへ解決済みの選択肢を渡す", async () => {
    const categoryWithSubCategories: DocumentCategoryDetail = {
      ...CATEGORY,
      subCategories: [{ id: "sub-1", name: "利用規約" }],
    };
    getVisibleDocumentCategoryMock.mockResolvedValueOnce(
      categoryWithSubCategories
    );
    getDocumentsByCategoryMock.mockResolvedValueOnce([DOCUMENT]);

    const jsx = await DocumentList({ categoryId: "cat-1" });
    render(jsx);

    expect(screen.getByText("利用規約")).toBeTruthy();
  });
});
