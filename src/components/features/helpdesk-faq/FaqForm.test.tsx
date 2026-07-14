import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FaqForm } from "@/components/features/helpdesk-faq/FaqForm";

const createFaqActionMock = vi.fn().mockResolvedValue({ id: "new-id" });
const updateFaqActionMock = vi.fn().mockResolvedValue({ id: "existing-id" });
const pushMock = vi.fn();

vi.mock("@/lib/actions/faqs", () => ({
  createFaqAction: (...args: unknown[]) => createFaqActionMock(...args),
  updateFaqAction: (...args: unknown[]) => updateFaqActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  createFaqActionMock.mockClear();
  updateFaqActionMock.mockClear();
  pushMock.mockClear();
});

const labels = {
  questionLabel: "質問",
  questionPlaceholder: "質問を入力してください",
  categoryLabel: "カテゴリ",
  categoryPlaceholder: "カテゴリを選択してください",
  answerLabel: "回答",
  answerPlaceholder: "回答を入力してください",
  submitButtonLabel: "保存する",
  requiredErrorMessage: "この項目は必須です",
  submitErrorMessage: "保存に失敗しました。時間を置いて再度お試しください。",
};

describe("FaqForm", () => {
  it("必須項目が未入力のまま送信するとcreateFaqActionが呼ばれない", async () => {
    render(<FaqForm mode="create" {...labels} />);

    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(screen.getAllByText("この項目は必須です").length).toBeGreaterThan(0);
    });
    expect(createFaqActionMock).not.toHaveBeenCalled();
  });

  it("入力済みで送信するとcreateFaqActionが呼ばれ一覧へ遷移する", async () => {
    render(<FaqForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("質問"), {
      target: { value: "新規質問" },
    });
    fireEvent.change(screen.getByLabelText("カテゴリ"), {
      target: { value: "other" },
    });
    fireEvent.change(screen.getByLabelText("回答"), {
      target: { value: "新規回答" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(createFaqActionMock).toHaveBeenCalledWith({
        category: "other",
        question: "新規質問",
        answer: "新規回答",
      });
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/faq");
  });

  it("保存操作が失敗したとき送信エラーメッセージを表示し、入力内容を保持する", async () => {
    createFaqActionMock.mockRejectedValueOnce(new Error("network error"));
    render(<FaqForm mode="create" {...labels} />);

    fireEvent.change(screen.getByLabelText("質問"), {
      target: { value: "新規質問" },
    });
    fireEvent.change(screen.getByLabelText("カテゴリ"), {
      target: { value: "other" },
    });
    fireEvent.change(screen.getByLabelText("回答"), {
      target: { value: "新規回答" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(
        screen.getByText("保存に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
    expect(
      (screen.getByLabelText("質問") as HTMLInputElement).value
    ).toBe("新規質問");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("編集モードでは既存の値が初期表示され、更新時にupdateFaqActionが呼ばれる", async () => {
    render(
      <FaqForm
        mode="edit"
        faqId="existing-id"
        defaultValues={{
          category: "status",
          question: "編集前の質問",
          answer: "編集前の回答",
        }}
        {...labels}
      />
    );

    expect(
      (screen.getByLabelText("質問") as HTMLInputElement).value
    ).toBe("編集前の質問");
    expect(
      (screen.getByLabelText("回答") as HTMLTextAreaElement).value
    ).toBe("編集前の回答");

    fireEvent.change(screen.getByLabelText("回答"), {
      target: { value: "編集後の回答" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(updateFaqActionMock).toHaveBeenCalledWith("existing-id", {
        category: "status",
        question: "編集前の質問",
        answer: "編集後の回答",
      });
    });
  });
});
