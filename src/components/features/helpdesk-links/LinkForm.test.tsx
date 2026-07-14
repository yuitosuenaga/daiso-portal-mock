import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LinkForm } from "@/components/features/helpdesk-links/LinkForm";

const createLinkActionMock = vi.fn().mockResolvedValue({ id: "new-id" });
const updateLinkActionMock = vi.fn().mockResolvedValue({ id: "existing-id" });
const pushMock = vi.fn();

vi.mock("@/lib/actions/links", () => ({
  createLinkAction: (...args: unknown[]) => createLinkActionMock(...args),
  updateLinkAction: (...args: unknown[]) => updateLinkActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  createLinkActionMock.mockClear();
  updateLinkActionMock.mockClear();
  pushMock.mockClear();
});

const labels = {
  titleLabel: "タイトル",
  titlePlaceholder: "タイトルを入力してください",
  urlLabel: "URL",
  urlPlaceholder: "https://example.com",
  categoryLabel: "カテゴリ",
  categoryPlaceholder: "カテゴリを選択してください",
  descriptionLabel: "説明（任意）",
  descriptionPlaceholder: "補足説明を入力してください",
  submitButtonLabel: "保存する",
  requiredErrorMessage: "この項目は必須です",
  invalidUrlErrorMessage: "有効なURLを入力してください",
  submitErrorMessage: "保存に失敗しました。時間を置いて再度お試しください。",
};

describe("LinkForm", () => {
  it("必須項目が未入力のまま送信するとcreateLinkActionが呼ばれない", async () => {
    render(<LinkForm mode="create" {...labels} />);

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(screen.getAllByText("この項目は必須です").length).toBeGreaterThan(0);
    });
    expect(createLinkActionMock).not.toHaveBeenCalled();
  });

  it("無効なURL形式のとき送信がブロックされ、専用のエラーメッセージが表示される", async () => {
    render(<LinkForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("タイトル"), {
      target: { value: "テストリンク" },
    });
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "not-a-valid-url" },
    });
    fireEvent.change(screen.getByLabelText("カテゴリ"), {
      target: { value: "other" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(screen.getByText("有効なURLを入力してください")).toBeTruthy();
    });
    expect(createLinkActionMock).not.toHaveBeenCalled();
  });

  it("入力済み（説明は未入力）で送信するとcreateLinkActionが呼ばれ一覧へ遷移する", async () => {
    render(<LinkForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("タイトル"), {
      target: { value: "新規リンク" },
    });
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://example.com" },
    });
    fireEvent.change(screen.getByLabelText("カテゴリ"), {
      target: { value: "other" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createLinkActionMock).toHaveBeenCalledWith({
        title: "新規リンク",
        url: "https://example.com",
        category: "other",
        description: "",
      });
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/links");
  });

  it("保存操作が失敗したとき送信エラーメッセージを表示し、入力内容を保持する", async () => {
    createLinkActionMock.mockRejectedValueOnce(new Error("network error"));
    render(<LinkForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("タイトル"), {
      target: { value: "新規リンク" },
    });
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://example.com" },
    });
    fireEvent.change(screen.getByLabelText("カテゴリ"), {
      target: { value: "other" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("保存に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
    expect(
      (screen.getByLabelText("タイトル") as HTMLInputElement).value
    ).toBe("新規リンク");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("編集モードでは既存の値が初期表示され、更新時にupdateLinkActionが呼ばれる", async () => {
    render(
      <LinkForm
        mode="edit"
        linkId="existing-id"
        defaultValues={{
          title: "編集前のリンク",
          url: "https://example.com/old",
          category: "internal",
          description: "編集前の説明",
        }}
        {...labels}
      />
    );

    expect(
      (screen.getByLabelText("タイトル") as HTMLInputElement).value
    ).toBe("編集前のリンク");
    expect(
      (screen.getByLabelText("URL") as HTMLInputElement).value
    ).toBe("https://example.com/old");

    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://example.com/new" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(updateLinkActionMock).toHaveBeenCalledWith("existing-id", {
        title: "編集前のリンク",
        url: "https://example.com/new",
        category: "internal",
        description: "編集前の説明",
      });
    });
  });
});
