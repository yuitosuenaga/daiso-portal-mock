import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentListClient } from "@/components/features/documents/DocumentListClient";
import type { Document } from "@/types/document";
import messages from "../../../../messages/ja.json";

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

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) =>
    (key: string) => resolveMessage(namespace, key),
}));

function makeDocument(
  overrides: Partial<Omit<Document, "sourceType">>
): Document {
  return {
    id: "1",
    title: "テストドキュメント",
    sourceType: "upload",
    status: "published",
    fileName: "test.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    dataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
    targeting: { scope: "all" },
    uploadedAt: "2026-07-01T09:00:00Z",
    translations: [],
    categoryId: "cat-1",
    subCategoryId: null,
    ...overrides,
  } as Document;
}

const BASE_PROPS = {
  locale: "ja",
  downloadLinkLabel: "ダウンロード",
  openOriginalLinkLabel: "元のドキュメントを開く",
  newBadgeLabel: "新着",
  googlePreviewErrorMessage: "プレビューを表示できませんでした",
  googlePreviewHint: "プレビューが表示されない場合は、元のドキュメントを開いてください",
};

describe("DocumentListClient", () => {
  it("中分類を選択すると該当ドキュメントのみに絞り込む", async () => {
    const docA = makeDocument({ id: "1", title: "規程A", subCategoryId: "sub-1" });
    const docB = makeDocument({ id: "2", title: "規程B", subCategoryId: "sub-2" });

    render(
      <DocumentListClient
        {...BASE_PROPS}
        documents={[docA, docB]}
        subCategories={[
          { id: "sub-1", name: "利用規約" },
          { id: "sub-2", name: "就業規則" },
        ]}
      />
    );

    expect(screen.getByText("規程A")).toBeTruthy();
    expect(screen.getByText("規程B")).toBeTruthy();

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByLabelText("中分類で絞り込み"),
      "利用規約"
    );

    expect(screen.getByText("規程A")).toBeTruthy();
    expect(screen.queryByText("規程B")).toBeNull();
  });

  it("「すべての中分類」では中分類未設定のドキュメントも含めて表示する", async () => {
    const docWithSub = makeDocument({ id: "1", title: "規程A", subCategoryId: "sub-1" });
    const docWithoutSub = makeDocument({ id: "2", title: "未分類ドキュメント", subCategoryId: null });

    render(
      <DocumentListClient
        {...BASE_PROPS}
        documents={[docWithSub, docWithoutSub]}
        subCategories={[{ id: "sub-1", name: "利用規約" }]}
      />
    );

    expect(screen.getByText("規程A")).toBeTruthy();
    expect(screen.getByText("未分類ドキュメント")).toBeTruthy();
  });

  it("中分類とキーワードの絞り込みをAND条件で適用する", async () => {
    const docMatch = makeDocument({ id: "1", title: "利用規約 v2", subCategoryId: "sub-1" });
    const docSameSubCategory = makeDocument({ id: "2", title: "別の書類", subCategoryId: "sub-1" });
    const docSameKeyword = makeDocument({ id: "3", title: "利用規約 旧版", subCategoryId: "sub-2" });

    render(
      <DocumentListClient
        {...BASE_PROPS}
        documents={[docMatch, docSameSubCategory, docSameKeyword]}
        subCategories={[
          { id: "sub-1", name: "利用規約カテゴリ" },
          { id: "sub-2", name: "その他" },
        ]}
      />
    );

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByLabelText("中分類で絞り込み"),
      "利用規約カテゴリ"
    );
    await user.type(screen.getByLabelText("キーワード検索"), "利用規約");

    expect(screen.getByText("利用規約 v2")).toBeTruthy();
    expect(screen.queryByText("別の書類")).toBeNull();
    expect(screen.queryByText("利用規約 旧版")).toBeNull();
  });

  it("条件クリアでキーワードと中分類の両方を初期化する", async () => {
    const docA = makeDocument({ id: "1", title: "規程A", subCategoryId: "sub-1" });
    const docB = makeDocument({ id: "2", title: "規程B", subCategoryId: "sub-2" });

    render(
      <DocumentListClient
        {...BASE_PROPS}
        documents={[docA, docB]}
        subCategories={[
          { id: "sub-1", name: "利用規約" },
          { id: "sub-2", name: "就業規則" },
        ]}
      />
    );

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByLabelText("中分類で絞り込み"),
      "利用規約"
    );
    await user.type(screen.getByLabelText("キーワード検索"), "規程A");

    expect(screen.queryByText("規程B")).toBeNull();

    await user.click(screen.getByRole("button", { name: "条件をクリア" }));

    expect(screen.getByText("規程A")).toBeTruthy();
    expect(screen.getByText("規程B")).toBeTruthy();
    expect(
      (screen.getByLabelText("中分類で絞り込み") as HTMLSelectElement).value
    ).toBe("");
    expect(
      (screen.getByLabelText("キーワード検索") as HTMLInputElement).value
    ).toBe("");
  });

  it("中分類が0件のとき絞り込みセレクトを描画しない", () => {
    const doc = makeDocument({ id: "1", title: "規程A" });

    render(
      <DocumentListClient {...BASE_PROPS} documents={[doc]} subCategories={[]} />
    );

    expect(screen.queryByLabelText("中分類で絞り込み")).toBeNull();
  });
});
