import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReplyForm } from "@/components/features/helpdesk-inquiries/ReplyForm";

const sendInquiryReplyActionMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/actions/helpdesk", () => ({
  sendInquiryReplyAction: (...args: unknown[]) =>
    sendInquiryReplyActionMock(...args),
}));

const labels = {
  templateLabel: "テンプレート",
  templatePlaceholder: "テンプレートを選択",
  noTemplatesMessage: "このカテゴリのテンプレートはありません",
  bodyLabel: "返信内容",
  bodyPlaceholder: "返信内容を入力してください",
  submitButtonLabel: "送信する",
  submittingLabel: "送信中...",
  successMessage: "返信を記録しました",
  errorMessage: "送信に失敗しました。時間を置いて再度お試しください。",
};

describe("ReplyForm", () => {
  it("テンプレートを選択すると本文が返信欄に挿入される", () => {
    render(
      <ReplyForm
        inquiryId="inquiry-001"
        templates={[
          { id: "t1", category: "defect", body: "テンプレート本文1" },
          { id: "t2", category: "defect", body: "テンプレート本文2" },
        ]}
        {...labels}
      />
    );

    fireEvent.change(screen.getByLabelText("テンプレート"), {
      target: { value: "t2" },
    });

    expect(
      (screen.getByLabelText("返信内容") as HTMLTextAreaElement).value
    ).toBe("テンプレート本文2");
  });

  it("挿入後の本文を自由に編集できる", () => {
    render(
      <ReplyForm
        inquiryId="inquiry-001"
        templates={[{ id: "t1", category: "defect", body: "テンプレート本文" }]}
        {...labels}
      />
    );

    fireEvent.change(screen.getByLabelText("テンプレート"), {
      target: { value: "t1" },
    });
    fireEvent.change(screen.getByLabelText("返信内容"), {
      target: { value: "編集後の本文" },
    });

    expect(
      (screen.getByLabelText("返信内容") as HTMLTextAreaElement).value
    ).toBe("編集後の本文");
  });

  it("送信するとsendInquiryReplyActionが呼ばれる", async () => {
    render(
      <ReplyForm
        inquiryId="inquiry-001"
        templates={[{ id: "t1", category: "defect", body: "テンプレート本文" }]}
        {...labels}
      />
    );

    fireEvent.change(screen.getByLabelText("返信内容"), {
      target: { value: "手動入力の返信" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => {
      expect(sendInquiryReplyActionMock).toHaveBeenCalledWith(
        "inquiry-001",
        "手動入力の返信"
      );
    });
  });

  it("テンプレートが0件のカテゴリでは選択肢が0件であることを示す", () => {
    render(<ReplyForm inquiryId="inquiry-001" templates={[]} {...labels} />);

    expect(
      screen.getByText("このカテゴリのテンプレートはありません")
    ).toBeTruthy();
  });

  it("送信に失敗した場合はエラーメッセージを表示する", async () => {
    sendInquiryReplyActionMock.mockRejectedValueOnce(new Error("failed"));

    render(
      <ReplyForm
        inquiryId="inquiry-001"
        templates={[{ id: "t1", category: "defect", body: "テンプレート本文" }]}
        {...labels}
      />
    );

    fireEvent.change(screen.getByLabelText("返信内容"), {
      target: { value: "手動入力の返信" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => {
      expect(screen.getByText(labels.errorMessage)).toBeTruthy();
    });
  });
});
