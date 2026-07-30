import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteLinkCategoryButton } from "@/components/features/helpdesk-links/DeleteLinkCategoryButton";

const deleteLinkCategoryActionMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/actions/link-categories", () => ({
  deleteLinkCategoryAction: (...args: unknown[]) =>
    deleteLinkCategoryActionMock(...args),
}));

const MESSAGES: Record<string, string> = {
  buttonLabel: "削除",
  confirmTitle: "カテゴリの削除",
  confirmMessage: "『{name}』を削除します。この操作は取り消せません。よろしいですか？",
  confirmButtonLabel: "削除する",
  cancelButtonLabel: "キャンセル",
  errorMessage: "削除に失敗しました。時間を置いて再度お試しください。",
  blockedByLinks:
    "『{name}』には{count}件のリンクが紐づいているため削除できません。先に対象リンクのカテゴリを変更してください。",
  blockedByChildren:
    "『{name}』には{count}件の中分類が存在するため削除できません。先に中分類を削除してください。",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    const template = MESSAGES[key] ?? key;
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (_, token: string) =>
      String(values[token] ?? `{${token}}`)
    );
  },
}));

beforeEach(() => {
  deleteLinkCategoryActionMock.mockClear();
});

describe("DeleteLinkCategoryButton", () => {
  it("紐づくリンクが1件以上あるとき、確認ダイアログを開かず件数入りのエラーメッセージを表示する", () => {
    render(
      <DeleteLinkCategoryButton
        categoryId="category-1"
        name="大分類A"
        linkCount={3}
        childCount={0}
        onDeleted={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        "『大分類A』には3件のリンクが紐づいているため削除できません。先に対象リンクのカテゴリを変更してください。"
      )
    ).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(deleteLinkCategoryActionMock).not.toHaveBeenCalled();
  });

  it("配下に中分類が1件以上あるとき、確認ダイアログを開かず件数入りのエラーメッセージを表示する", () => {
    render(
      <DeleteLinkCategoryButton
        categoryId="category-1"
        name="大分類A"
        linkCount={0}
        childCount={2}
        onDeleted={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        "『大分類A』には2件の中分類が存在するため削除できません。先に中分類を削除してください。"
      )
    ).toBeTruthy();
  });

  it("紐づくリンク・配下の中分類がいずれも0件のとき、確認して削除を実行する", async () => {
    const onDeleted = vi.fn();
    render(
      <DeleteLinkCategoryButton
        categoryId="category-1"
        name="大分類A"
        linkCount={0}
        childCount={0}
        onDeleted={onDeleted}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(
      screen.getByText("『大分類A』を削除します。この操作は取り消せません。よろしいですか？")
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(deleteLinkCategoryActionMock).toHaveBeenCalledWith("category-1");
    });
    expect(onDeleted).toHaveBeenCalled();
  });

  it("確認モーダルをキャンセルすると削除を実行しない", () => {
    render(
      <DeleteLinkCategoryButton
        categoryId="category-1"
        name="大分類A"
        linkCount={0}
        childCount={0}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(deleteLinkCategoryActionMock).not.toHaveBeenCalled();
  });
});
