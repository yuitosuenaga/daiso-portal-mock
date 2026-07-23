import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteAnnouncementButton } from "@/components/features/helpdesk-announcements/DeleteAnnouncementButton";

const deleteAnnouncementActionMock = vi.fn().mockResolvedValue(undefined);
const pushMock = vi.fn();

vi.mock("@/lib/actions/announcements", () => ({
  deleteAnnouncementAction: (...args: unknown[]) =>
    deleteAnnouncementActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  deleteAnnouncementActionMock.mockClear();
  pushMock.mockClear();
});

const DEFAULT_PROPS = {
  announcementId: "1",
  announcementTitle: "テストお知らせ",
  deleteButtonLabel: "削除",
  confirmTitle: "お知らせの削除",
  confirmDescription:
    "『テストお知らせ』を削除します。この操作は取り消せません。よろしいですか？",
  confirmLabel: "削除する",
  cancelLabel: "キャンセル",
  errorMessage: "削除に失敗しました。時間を置いて再度お試しください。",
};

describe("DeleteAnnouncementButton", () => {
  it("トリガー押下で確認モーダルが開き、対象タイトルを含む本文が表示される", () => {
    render(<DeleteAnnouncementButton {...DEFAULT_PROPS} />);

    expect(screen.queryByText(DEFAULT_PROPS.confirmDescription)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(screen.getByText("お知らせの削除")).toBeTruthy();
    expect(screen.getByText(DEFAULT_PROPS.confirmDescription)).toBeTruthy();
  });

  it("確認モーダルで確定するとdeleteAnnouncementActionが呼ばれ、一覧へ遷移する", async () => {
    render(<DeleteAnnouncementButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(deleteAnnouncementActionMock).toHaveBeenCalledWith("1");
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/announcements");
  });

  it("削除に失敗した場合はエラーメッセージを表示し、遷移しない", async () => {
    deleteAnnouncementActionMock.mockRejectedValueOnce(new Error("failed"));
    render(<DeleteAnnouncementButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(
        screen.getByText("削除に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("確認モーダルをキャンセルするとdeleteAnnouncementActionが呼ばれない", () => {
    render(<DeleteAnnouncementButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(deleteAnnouncementActionMock).not.toHaveBeenCalled();
    expect(screen.queryByText(DEFAULT_PROPS.confirmDescription)).toBeNull();
  });
});
