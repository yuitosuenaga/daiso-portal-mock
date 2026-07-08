import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplateForm } from "@/components/features/helpdesk-templates/TemplateForm";
import { TEMPLATE_NAME_MAX_LENGTH } from "@/lib/validation/reply-template";

const createReplyTemplateActionMock = vi.fn().mockResolvedValue({ id: "new-id" });
const updateReplyTemplateActionMock = vi.fn().mockResolvedValue({ id: "existing-id" });
const pushMock = vi.fn();

vi.mock("@/lib/actions/helpdesk", () => ({
  createReplyTemplateAction: (...args: unknown[]) =>
    createReplyTemplateActionMock(...args),
  updateReplyTemplateAction: (...args: unknown[]) =>
    updateReplyTemplateActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  createReplyTemplateActionMock.mockClear();
  updateReplyTemplateActionMock.mockClear();
  pushMock.mockClear();
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
});
