import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplateForm } from "@/components/features/helpdesk-templates/TemplateForm";
import { TEMPLATE_NAME_MAX_LENGTH } from "@/lib/validation/reply-template";

const createReplyTemplateActionMock = vi.fn();
const updateReplyTemplateActionMock = vi.fn();
const retranslateReplyTemplateActionMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/actions/helpdesk", () => ({
  createReplyTemplateAction: (...args: unknown[]) =>
    createReplyTemplateActionMock(...args),
  updateReplyTemplateAction: (...args: unknown[]) =>
    updateReplyTemplateActionMock(...args),
  retranslateReplyTemplateAction: (...args: unknown[]) =>
    retranslateReplyTemplateActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  createReplyTemplateActionMock.mockResolvedValue({
    template: { id: "new-id" },
    failedLocales: [],
  });
  updateReplyTemplateActionMock.mockResolvedValue({
    template: { id: "existing-id" },
    failedLocales: [],
  });
  retranslateReplyTemplateActionMock.mockResolvedValue({ failedLocales: [] });
});

const labels = {
  nameLabel: "テンプレート名",
  namePlaceholder: "テンプレート名を入力してください",
  categoryLabel: "案件種別",
  categoryPlaceholder: "案件種別を選択してください",
  bodyLabel: "本文",
  bodyPlaceholder: "テンプレート本文を入力してください",
  submitButtonLabel: "保存する",
  requiredErrorMessage: "この項目は必須です",
  nameTooLongErrorMessage: "テンプレート名は40文字以内で入力してください",
  submitErrorMessage: "保存に失敗しました。時間を置いて再度お試しください。",
  translationFailedMessage: "一部の言語の翻訳に失敗しました。後から再翻訳できます",
  retranslateButtonLabel: "再翻訳",
};

describe("TemplateForm", () => {
  it("必須項目が未入力のまま送信するとcreateReplyTemplateActionが呼ばれない", async () => {
    render(<TemplateForm mode="create" {...labels} />);

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(screen.getAllByText("この項目は必須です").length).toBeGreaterThan(0);
    });
    expect(createReplyTemplateActionMock).not.toHaveBeenCalled();
  });

  it("入力済みで送信するとcreateReplyTemplateActionが呼ばれ一覧へ遷移する", async () => {
    render(<TemplateForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("テンプレート名"), {
      target: { value: "新規テンプレート名" },
    });
    fireEvent.change(screen.getByLabelText("案件種別"), {
      target: { value: "defect" },
    });
    fireEvent.change(screen.getByLabelText("本文"), {
      target: { value: "新規テンプレート本文" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createReplyTemplateActionMock).toHaveBeenCalledWith({
        category: "defect",
        name: "新規テンプレート名",
        body: "新規テンプレート本文",
      });
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/templates");
  });

  it("テンプレート名が上限文字数を超える場合、送信がブロックされエラーが表示される", async () => {
    render(<TemplateForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("テンプレート名"), {
      target: { value: "あ".repeat(TEMPLATE_NAME_MAX_LENGTH + 1) },
    });
    fireEvent.change(screen.getByLabelText("案件種別"), {
      target: { value: "defect" },
    });
    fireEvent.change(screen.getByLabelText("本文"), {
      target: { value: "新規テンプレート本文" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("テンプレート名は40文字以内で入力してください")
      ).toBeTruthy();
    });
    expect(createReplyTemplateActionMock).not.toHaveBeenCalled();
  });

  it("保存操作が失敗したとき送信エラーメッセージを表示し、入力内容を保持する", async () => {
    createReplyTemplateActionMock.mockRejectedValueOnce(new Error("network error"));
    render(<TemplateForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("テンプレート名"), {
      target: { value: "新規テンプレート名" },
    });
    fireEvent.change(screen.getByLabelText("案件種別"), {
      target: { value: "defect" },
    });
    fireEvent.change(screen.getByLabelText("本文"), {
      target: { value: "新規テンプレート本文" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("保存に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
    expect(
      (screen.getByLabelText("テンプレート名") as HTMLInputElement).value
    ).toBe("新規テンプレート名");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("編集モードでは既存の値が初期表示され、更新時にupdateReplyTemplateActionが呼ばれる", async () => {
    render(
      <TemplateForm
        mode="edit"
        templateId="existing-id"
        defaultValues={{
          category: "order",
          name: "編集前の名前",
          body: "編集前の本文",
        }}
        {...labels}
      />
    );

    expect(
      (screen.getByLabelText("テンプレート名") as HTMLInputElement).value
    ).toBe("編集前の名前");
    expect(
      (screen.getByLabelText("本文") as HTMLTextAreaElement).value
    ).toBe("編集前の本文");

    fireEvent.change(screen.getByLabelText("本文"), {
      target: { value: "編集後の本文" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(updateReplyTemplateActionMock).toHaveBeenCalledWith("existing-id", {
        category: "order",
        name: "編集前の名前",
        body: "編集後の本文",
      });
    });
  });

  it("一部言語の翻訳に失敗した場合はメッセージと再翻訳ボタンを表示し、再翻訳成功で一覧へ遷移する", async () => {
    createReplyTemplateActionMock.mockResolvedValueOnce({
      template: { id: "new-id" },
      failedLocales: ["th"],
    });
    render(<TemplateForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("テンプレート名"), {
      target: { value: "新規テンプレート名" },
    });
    fireEvent.change(screen.getByLabelText("案件種別"), { target: { value: "defect" } });
    fireEvent.change(screen.getByLabelText("本文"), {
      target: { value: "新規テンプレート本文" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("一部の言語の翻訳に失敗しました。後から再翻訳できます")
      ).toBeTruthy();
    });
    expect(pushMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "再翻訳" }));

    await waitFor(() => {
      expect(retranslateReplyTemplateActionMock).toHaveBeenCalledWith("new-id");
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/templates");
  });

  it("新規作成直後は再翻訳ボタンを表示しない", () => {
    render(<TemplateForm mode="create" {...labels} />);

    expect(screen.queryByRole("button", { name: "再翻訳" })).toBeNull();
  });
});
