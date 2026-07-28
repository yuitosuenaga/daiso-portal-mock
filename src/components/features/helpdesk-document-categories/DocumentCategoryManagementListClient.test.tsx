import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentCategoryManagementListClient } from "@/components/features/helpdesk-document-categories/DocumentCategoryManagementListClient";
import type { DocumentCategoryAdminView } from "@/types/document-category";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/actions/document-categories", () => ({
  createDocumentCategoryAction: vi.fn(),
  updateDocumentCategoryAction: vi.fn(),
  deleteDocumentCategoryAction: vi.fn(),
  moveDocumentCategoryAction: vi.fn(),
}));

const MESSAGES: Record<string, string> = {
  addParentButton: "大分類を追加",
  addChildButton: "中分類を追加",
  editButton: "編集",
  moveUpButton: "上へ",
  moveDownButton: "下へ",
  empty: "カテゴリはありません",
  title: "ドキュメントカテゴリ管理",
  documentCountLabel: "ドキュメント数: {count}件",
  subCategoryCountLabel: "中分類数: {count}件",
};

const DELETE_MESSAGES: Record<string, string> = {
  buttonLabel: "削除",
  confirmTitle: "カテゴリの削除",
  confirmMessage: "『{name}』を削除します。この操作は取り消せません。よろしいですか？",
  confirmButtonLabel: "削除する",
  cancelButtonLabel: "キャンセル",
  errorMessage: "削除に失敗しました。",
  blockedByDocuments: "『{name}』には{count}件のドキュメントが紐づいているため削除できません。",
  blockedByChildren: "『{name}』には{count}件の中分類が存在するため削除できません。",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const dict = namespace.endsWith(".delete") ? DELETE_MESSAGES : MESSAGES;
    return (key: string, values?: Record<string, unknown>) => {
      const template = dict[key] ?? `${namespace}.${key}`;
      if (!values) return template;
      return template.replace(/\{(\w+)\}/g, (_, token: string) =>
        String(values[token] ?? `{${token}}`)
      );
    };
  },
}));

function buildCategory(
  overrides: Partial<DocumentCategoryAdminView> = {}
): DocumentCategoryAdminView {
  return {
    id: "category-1",
    parentId: null,
    name: "大分類1",
    displayOrder: 0,
    targeting: { scope: "all" },
    translations: [],
    documentCount: 0,
    children: [],
    ...overrides,
  };
}

describe("DocumentCategoryManagementListClient", () => {
  it("大分類が0件のとき0件メッセージを表示する", () => {
    render(
      <DocumentCategoryManagementListClient
        categories={[]}
        countryOptions={[]}
        companyOptions={[]}
        targetingLabels={{
          allLabel: "全体公開",
          countriesLabel: "対象国",
          companiesLabel: "対象販社",
          countryLabels: {},
          companyLabels: {},
        }}
      />
    );

    expect(screen.getByText("カテゴリはありません")).toBeTruthy();
  });

  it("大分類とその配下の中分類を階層が分かる形で表示し、件数を表示する", () => {
    const categories = [
      buildCategory({
        id: "category-1",
        name: "大分類1",
        documentCount: 3,
        children: [
          {
            id: "sub-1",
            parentId: "category-1",
            name: "中分類1",
            displayOrder: 0,
            targeting: { scope: "all" },
            translations: [],
            documentCount: 1,
          },
        ],
      }),
    ];

    render(
      <DocumentCategoryManagementListClient
        categories={categories}
        countryOptions={[]}
        companyOptions={[]}
        targetingLabels={{
          allLabel: "全体公開",
          countriesLabel: "対象国",
          companiesLabel: "対象販社",
          countryLabels: {},
          companyLabels: {},
        }}
      />
    );

    expect(screen.getByText("大分類1")).toBeTruthy();
    expect(screen.getByText("中分類1")).toBeTruthy();
    expect(screen.getByText("ドキュメント数: 3件")).toBeTruthy();
    expect(screen.getByText("中分類数: 1件")).toBeTruthy();
  });

  it("削除ボタン押下時、件数>0のカテゴリは確認ダイアログを開かず件数入りメッセージを表示する", () => {
    const categories = [buildCategory({ documentCount: 5 })];

    render(
      <DocumentCategoryManagementListClient
        categories={categories}
        countryOptions={[]}
        companyOptions={[]}
        targetingLabels={{
          allLabel: "全体公開",
          countriesLabel: "対象国",
          companiesLabel: "対象販社",
          countryLabels: {},
          companyLabels: {},
        }}
      />
    );

    expect(
      screen.getByText("『大分類1』には5件のドキュメントが紐づいているため削除できません。")
    ).toBeTruthy();
  });
});
