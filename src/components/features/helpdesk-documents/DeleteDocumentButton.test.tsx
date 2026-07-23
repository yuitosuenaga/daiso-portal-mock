import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteDocumentButton } from "@/components/features/helpdesk-documents/DeleteDocumentButton";

const deleteDocumentActionMock = vi.fn().mockResolvedValue(undefined);
const pushMock = vi.fn();

vi.mock("@/lib/actions/documents", () => ({
  deleteDocumentAction: (...args: unknown[]) => deleteDocumentActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  deleteDocumentActionMock.mockClear();
  pushMock.mockClear();
});

const DEFAULT_PROPS = {
  documentId: "1",
  title: "テストドキュメント",
  deleteButtonLabel: "削除",
  confirmTitle: "ドキュメントの削除",
  confirmMessage:
    "『テストドキュメント』を削除します。この操作は取り消せません。よろしいですか？",
  confirmButtonLabel: "削除する",
  cancelButtonLabel: "キャンセル",
  errorMessage: "削除に失敗しました。時間を置いて再度お試しください。",
};

describe("DeleteDocumentButton", () => {
  it("トリガー押下で確認モーダルが開き、対象タイトルを含む本文が表示される", () => {
    render(<DeleteDocumentButton {...DEFAULT_PROPS} />);

    expect(screen.queryByText(DEFAULT_PROPS.confirmMessage)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(screen.getByText("ドキュメントの削除")).toBeTruthy();
    expect(screen.getByText(DEFAULT_PROPS.confirmMessage)).toBeTruthy();
  });

  it("確認モーダルで確定するとdeleteDocumentActionが呼ばれ、一覧へ遷移する", async () => {
    render(<DeleteDocumentButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(deleteDocumentActionMock).toHaveBeenCalledWith("1");
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/documents");
  });

  it("削除に失敗した場合はエラーメッセージを表示し、遷移しない", async () => {
    deleteDocumentActionMock.mockRejectedValueOnce(new Error("failed"));
    render(<DeleteDocumentButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(
        screen.getByText("削除に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("確認モーダルをキャンセルするとdeleteDocumentActionが呼ばれない", () => {
    render(<DeleteDocumentButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(deleteDocumentActionMock).not.toHaveBeenCalled();
    expect(screen.queryByText(DEFAULT_PROPS.confirmMessage)).toBeNull();
  });
});
