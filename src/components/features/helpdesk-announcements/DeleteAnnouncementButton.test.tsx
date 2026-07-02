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

describe("DeleteAnnouncementButton", () => {
  it("確認して削除するとdeleteAnnouncementActionが呼ばれる", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    render(
      <DeleteAnnouncementButton
        announcementId="1"
        deleteButtonLabel="削除"
        confirmMessage="このお知らせを削除しますか？"
        errorMessage="削除に失敗しました。時間を置いて再度お試しください。"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => {
      expect(deleteAnnouncementActionMock).toHaveBeenCalledWith("1");
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/announcements");
  });

  it("削除に失敗した場合はエラーメッセージを表示し、遷移しない", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    deleteAnnouncementActionMock.mockRejectedValueOnce(new Error("failed"));

    render(
      <DeleteAnnouncementButton
        announcementId="1"
        deleteButtonLabel="削除"
        confirmMessage="このお知らせを削除しますか？"
        errorMessage="削除に失敗しました。時間を置いて再度お試しください。"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => {
      expect(
        screen.getByText("削除に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("確認をキャンセルするとdeleteAnnouncementActionが呼ばれない", () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);

    render(
      <DeleteAnnouncementButton
        announcementId="1"
        deleteButtonLabel="削除"
        confirmMessage="このお知らせを削除しますか？"
        errorMessage="削除に失敗しました。時間を置いて再度お試しください。"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(deleteAnnouncementActionMock).not.toHaveBeenCalled();
  });
});
