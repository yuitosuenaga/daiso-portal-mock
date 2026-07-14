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

describe("DeleteFaqButton", () => {
  it("確認して削除するとdeleteFaqActionが呼ばれる", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    render(
      <DeleteFaqButton
        faqId="1"
        deleteButtonLabel="削除"
        confirmMessage="このFAQを削除しますか？"
        errorMessage="削除に失敗しました。時間を置いて再度お試しください。"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => {
      expect(deleteFaqActionMock).toHaveBeenCalledWith("1");
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/faq");
  });

  it("削除に失敗した場合はエラーメッセージを表示し、遷移しない", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    deleteFaqActionMock.mockRejectedValueOnce(new Error("failed"));

    render(
      <DeleteFaqButton
        faqId="1"
        deleteButtonLabel="削除"
        confirmMessage="このFAQを削除しますか？"
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

  it("確認をキャンセルするとdeleteFaqActionが呼ばれない", () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);

    render(
      <DeleteFaqButton
        faqId="1"
        deleteButtonLabel="削除"
        confirmMessage="このFAQを削除しますか？"
        errorMessage="削除に失敗しました。時間を置いて再度お試しください。"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(deleteFaqActionMock).not.toHaveBeenCalled();
  });
});
