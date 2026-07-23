import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteLinkButton } from "@/components/features/helpdesk-links/DeleteLinkButton";

const deleteLinkActionMock = vi.fn().mockResolvedValue(undefined);
const pushMock = vi.fn();

vi.mock("@/lib/actions/links", () => ({
  deleteLinkAction: (...args: unknown[]) => deleteLinkActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  deleteLinkActionMock.mockClear();
  pushMock.mockClear();
});

const DEFAULT_PROPS = {
  linkId: "1",
  title: "テストリンク",
  deleteButtonLabel: "削除",
  confirmTitle: "リンクの削除",
  confirmMessage:
    "『テストリンク』を削除します。この操作は取り消せません。よろしいですか？",
  confirmButtonLabel: "削除する",
  cancelButtonLabel: "キャンセル",
  errorMessage: "削除に失敗しました。時間を置いて再度お試しください。",
};

describe("DeleteLinkButton", () => {
  it("トリガー押下で確認モーダルが開き、対象タイトルを含む本文が表示される", () => {
    render(<DeleteLinkButton {...DEFAULT_PROPS} />);

    expect(screen.queryByText(DEFAULT_PROPS.confirmMessage)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(screen.getByText("リンクの削除")).toBeTruthy();
    expect(screen.getByText(DEFAULT_PROPS.confirmMessage)).toBeTruthy();
  });

  it("確認モーダルで確定するとdeleteLinkActionが呼ばれ、一覧へ遷移する", async () => {
    render(<DeleteLinkButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(deleteLinkActionMock).toHaveBeenCalledWith("1");
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/links");
  });

  it("削除に失敗した場合はエラーメッセージを表示し、遷移しない", async () => {
    deleteLinkActionMock.mockRejectedValueOnce(new Error("failed"));
    render(<DeleteLinkButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(
        screen.getByText("削除に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("確認モーダルをキャンセルするとdeleteLinkActionが呼ばれない", () => {
    render(<DeleteLinkButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(deleteLinkActionMock).not.toHaveBeenCalled();
    expect(screen.queryByText(DEFAULT_PROPS.confirmMessage)).toBeNull();
  });
});
