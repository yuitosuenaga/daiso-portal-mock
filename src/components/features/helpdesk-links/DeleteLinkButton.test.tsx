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

describe("DeleteLinkButton", () => {
  it("確認して削除するとdeleteLinkActionが呼ばれる", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    render(
      <DeleteLinkButton
        linkId="1"
        deleteButtonLabel="削除"
        confirmMessage="このリンクを削除しますか？"
        errorMessage="削除に失敗しました。時間を置いて再度お試しください。"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => {
      expect(deleteLinkActionMock).toHaveBeenCalledWith("1");
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/links");
  });

  it("削除に失敗した場合はエラーメッセージを表示し、遷移しない", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    deleteLinkActionMock.mockRejectedValueOnce(new Error("failed"));

    render(
      <DeleteLinkButton
        linkId="1"
        deleteButtonLabel="削除"
        confirmMessage="このリンクを削除しますか？"
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

  it("確認をキャンセルするとdeleteLinkActionが呼ばれない", () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);

    render(
      <DeleteLinkButton
        linkId="1"
        deleteButtonLabel="削除"
        confirmMessage="このリンクを削除しますか？"
        errorMessage="削除に失敗しました。時間を置いて再度お試しください。"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(deleteLinkActionMock).not.toHaveBeenCalled();
  });
});
