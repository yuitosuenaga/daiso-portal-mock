import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteFaqButton } from "@/components/features/helpdesk-faq/DeleteFaqButton";

const deleteFaqActionMock = vi.fn().mockResolvedValue(undefined);
const pushMock = vi.fn();

vi.mock("@/lib/actions/faqs", () => ({
  deleteFaqAction: (...args: unknown[]) => deleteFaqActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  deleteFaqActionMock.mockClear();
  pushMock.mockClear();
});

const DEFAULT_PROPS = {
  faqId: "1",
  deleteButtonLabel: "削除",
  confirmTitle: "FAQの削除",
  confirmMessage: "『テスト質問』を削除します。この操作は取り消せません。よろしいですか？",
  confirmButtonLabel: "削除する",
  cancelButtonLabel: "キャンセル",
  errorMessage: "削除に失敗しました。時間を置いて再度お試しください。",
};

describe("DeleteFaqButton", () => {
  it("トリガー押下で確認モーダルが開き、対象質問文を含む本文が表示される", () => {
    render(<DeleteFaqButton {...DEFAULT_PROPS} />);

    expect(screen.queryByText(DEFAULT_PROPS.confirmMessage)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(screen.getByText("FAQの削除")).toBeTruthy();
    expect(screen.getByText(DEFAULT_PROPS.confirmMessage)).toBeTruthy();
  });

  it("確認モーダルで確定するとdeleteFaqActionが呼ばれ、一覧へ遷移する", async () => {
    render(<DeleteFaqButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(deleteFaqActionMock).toHaveBeenCalledWith("1");
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/faq");
  });

  it("削除に失敗した場合はエラーメッセージを表示し、遷移しない", async () => {
    deleteFaqActionMock.mockRejectedValueOnce(new Error("failed"));
    render(<DeleteFaqButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(
        screen.getByText("削除に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("確認モーダルをキャンセルするとdeleteFaqActionが呼ばれない", () => {
    render(<DeleteFaqButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(deleteFaqActionMock).not.toHaveBeenCalled();
    expect(screen.queryByText(DEFAULT_PROPS.confirmMessage)).toBeNull();
  });
});
