import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LinkCategoryManagementListClient } from "@/components/features/helpdesk-links/LinkCategoryManagementListClient";
import type { LinkCategoryAdminView } from "@/types/link-category";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/actions/link-categories", () => ({
  createLinkCategoryAction: vi.fn(),
  updateLinkCategoryAction: vi.fn(),
  deleteLinkCategoryAction: vi.fn(),
  moveLinkCategoryAction: vi.fn(),
}));

const MESSAGES: Record<string, string> = {
  addParentButton: "大分類を追加",
  addChildButton: "中分類を追加",
  editButton: "編集",
  moveUpButton: "上へ",
  moveDownButton: "下へ",
  empty: "カテゴリはありません",
  title: "リンクカテゴリ管理",
  linkCountLabel: "リンク数: {count}件",
  subCategoryCountLabel: "中分類数: {count}件",
};

const DELETE_MESSAGES: Record<string, string> = {
  buttonLabel: "削除",
  confirmTitle: "カテゴリの削除",
  confirmMessage: "『{name}』を削除します。この操作は取り消せません。よろしいですか？",
  confirmButtonLabel: "削除する",
  cancelButtonLabel: "キャンセル",
  errorMessage: "削除に失敗しました。",
  blockedByLinks: "『{name}』には{count}件のリンクが紐づいているため削除できません。",
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
  overrides: Partial<LinkCategoryAdminView> = {}
): LinkCategoryAdminView {
  return {
    id: "category-1",
    parentId: null,
    name: "大分類1",
    displayOrder: 0,
    translations: [],
    linkCount: 0,
    children: [],
    ...overrides,
  };
}

describe("LinkCategoryManagementListClient", () => {
  it("大分類が0件のとき0件メッセージを表示する", () => {
    render(<LinkCategoryManagementListClient categories={[]} />);

    expect(screen.getByText("カテゴリはありません")).toBeTruthy();
  });

  it("大分類とその配下の中分類を階層が分かる形で表示し、件数を表示する", () => {
    const categories = [
      buildCategory({
        id: "category-1",
        name: "大分類1",
        linkCount: 3,
        children: [
          {
            id: "sub-1",
            parentId: "category-1",
            name: "中分類1",
            displayOrder: 0,
            translations: [],
            linkCount: 1,
          },
        ],
      }),
    ];

    render(<LinkCategoryManagementListClient categories={categories} />);

    expect(screen.getByText("大分類1")).toBeTruthy();
    expect(screen.getByText("中分類1")).toBeTruthy();
    expect(screen.getByText("リンク数: 3件")).toBeTruthy();
    expect(screen.getByText("中分類数: 1件")).toBeTruthy();
  });

  it("削除ボタン押下時、件数>0のカテゴリは確認ダイアログを開かず件数入りメッセージを表示する", () => {
    const categories = [buildCategory({ linkCount: 5 })];

    render(<LinkCategoryManagementListClient categories={categories} />);

    expect(
      screen.getByText("『大分類1』には5件のリンクが紐づいているため削除できません。")
    ).toBeTruthy();
  });
});
