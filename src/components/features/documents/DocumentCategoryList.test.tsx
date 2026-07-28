import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentCategoryList } from "@/components/features/documents/DocumentCategoryList";
import type { DocumentCategorySummary } from "@/types/document-category";
import messages from "../../../../messages/ja.json";

const getVisibleDocumentCategoriesMock = vi.fn();

vi.mock("@/lib/api/document-categories", () => ({
  getVisibleDocumentCategories: (...args: unknown[]) =>
    getVisibleDocumentCategoriesMock(...args),
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

function resolveMessage(namespace: string, key: string, values?: Record<string, unknown>): string {
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
  return Object.entries(values).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    value
  );
}

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    (key: string, values?: Record<string, unknown>) =>
      resolveMessage(namespace, key, values),
  getLocale: async () => "ja",
}));

const CATEGORY: DocumentCategorySummary = {
  id: "cat-1",
  name: "規程・マニュアル",
  documentCount: 3,
};

describe("DocumentCategoryList", () => {
  it("見出し（h1+説明文）を全分岐で描画する", async () => {
    getVisibleDocumentCategoriesMock.mockResolvedValueOnce([]);

    const jsx = await DocumentCategoryList();
    render(jsx);

    expect(screen.getByRole("heading", { level: 1, name: "ドキュメント" })).toBeTruthy();
    expect(
      screen.getByText("本社が公開している業務ドキュメントを確認できます。")
    ).toBeTruthy();
  });

  it("取得成功時に大分類カードをグリッド表示する", async () => {
    getVisibleDocumentCategoriesMock.mockResolvedValueOnce([CATEGORY]);

    const jsx = await DocumentCategoryList();
    render(jsx);

    expect(screen.getByText("規程・マニュアル")).toBeTruthy();
    expect(screen.getByText("3件")).toBeTruthy();
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/documents/categories/cat-1");
  });

  it("大分類が0件のとき空状態メッセージを表示する", async () => {
    getVisibleDocumentCategoriesMock.mockResolvedValueOnce([]);

    const jsx = await DocumentCategoryList();
    render(jsx);

    expect(screen.getByText("ドキュメントはありません")).toBeTruthy();
  });

  it("取得に失敗したときエラーメッセージを表示する", async () => {
    getVisibleDocumentCategoriesMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await DocumentCategoryList();
    render(jsx);

    expect(screen.getByText("ドキュメントの取得に失敗しました")).toBeTruthy();
  });

  it("getVisibleDocumentCategoriesへ選択中のロケールを渡す", async () => {
    getVisibleDocumentCategoriesMock.mockResolvedValueOnce([]);

    await DocumentCategoryList();

    expect(getVisibleDocumentCategoriesMock).toHaveBeenCalledWith({ locale: "ja" });
  });
});
