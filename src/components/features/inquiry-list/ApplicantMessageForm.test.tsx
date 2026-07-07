import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicantMessageForm } from "@/components/features/inquiry-list/ApplicantMessageForm";

const sendApplicantMessageActionMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/actions/inquiry", () => ({
  sendApplicantMessageAction: (...args: unknown[]) =>
    sendApplicantMessageActionMock(...args),
}));

beforeEach(() => {
  sendApplicantMessageActionMock.mockClear();
});

const labels = {
  bodyLabel: "メッセージ内容",
  bodyPlaceholder: "メッセージを入力してください",
  submitButtonLabel: "送信する",
  submittingLabel: "送信中...",
  successMessage: "メッセージを送信しました",
  errorMessage: "送信に失敗しました。時間を置いて再度お試しください。",
  attachmentsLabel: "添付ファイル",
  attachmentsHint: "画像またはPDF、1件5MBまで、最大5件まで添付できます。",
  attachmentsRemoveButtonLabel: "削除",
  attachmentsSizeExceededMessage: "ファイルサイズが上限（5MB）を超えています",
  attachmentsTypeNotAllowedMessage:
    "許可されていないファイル形式です（画像またはPDFのみ）",
  attachmentsCountExceededMessage:
    "添付できるファイル数の上限（5件）を超えています",
  attachmentsReadFailedMessage:
    "ファイルの読み込みに失敗しました。もう一度お試しください。",
};

describe("ApplicantMessageForm", () => {
  it("本文が未入力のとき送信ボタンが無効化される", () => {
    render(<ApplicantMessageForm inquiryId="inquiry-001" {...labels} />);

    const button = screen.getByRole("button", {
      name: "送信する",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("本文を入力すると送信ボタンが有効化され、送信するとsendApplicantMessageActionが呼ばれる", async () => {
    render(<ApplicantMessageForm inquiryId="inquiry-001" {...labels} />);

    fireEvent.change(screen.getByLabelText("メッセージ内容"), {
      target: { value: "発送予定日を教えてください。" },
    });
    const button = screen.getByRole("button", {
      name: "送信する",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => {
      expect(sendApplicantMessageActionMock).toHaveBeenCalledWith(
        "inquiry-001",
        "発送予定日を教えてください。",
        []
      );
    });
  });

  it("添付ファイルを選択して送信すると、sendApplicantMessageActionに添付ファイルが渡される", async () => {
    render(<ApplicantMessageForm inquiryId="inquiry-001" {...labels} />);

    fireEvent.change(screen.getByLabelText("メッセージ内容"), {
      target: { value: "資料を添付します" },
    });

    const file = new File([new Uint8Array(100)], "memo.pdf", {
      type: "application/pdf",
    });
    const input = screen.getByLabelText("添付ファイル") as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText(/memo\.pdf/)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => {
      expect(sendApplicantMessageActionMock).toHaveBeenCalledTimes(1);
    });
    const attachments = sendApplicantMessageActionMock.mock.calls[0][2];
    expect(attachments).toHaveLength(1);
    expect(attachments[0].fileName).toBe("memo.pdf");
  });

  it("送信成功後、本文・添付ファイルの入力欄がリセットされる", async () => {
    render(<ApplicantMessageForm inquiryId="inquiry-001" {...labels} />);

    fireEvent.change(screen.getByLabelText("メッセージ内容"), {
      target: { value: "追加のご連絡です。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => {
      expect(
        (screen.getByLabelText("メッセージ内容") as HTMLTextAreaElement).value
      ).toBe("");
    });
  });

  it("送信に失敗した場合はエラーメッセージを表示し、入力内容を保持する", async () => {
    sendApplicantMessageActionMock.mockRejectedValueOnce(new Error("failed"));

    render(<ApplicantMessageForm inquiryId="inquiry-001" {...labels} />);

    fireEvent.change(screen.getByLabelText("メッセージ内容"), {
      target: { value: "手動入力のメッセージ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => {
      expect(screen.getByText(labels.errorMessage)).toBeTruthy();
    });
    expect(
      (screen.getByLabelText("メッセージ内容") as HTMLTextAreaElement).value
    ).toBe("手動入力のメッセージ");
  });
});
