import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteMonthlyMaterialButton } from "@/components/features/monthly-materials/DeleteMonthlyMaterialButton";

const deleteMonthlyMaterialActionMock = vi.fn().mockResolvedValue(undefined);
const refreshMock = vi.fn();

vi.mock("@/lib/actions/monthly-materials", () => ({
  deleteMonthlyMaterialAction: (...args: unknown[]) =>
    deleteMonthlyMaterialActionMock(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

beforeEach(() => {
  deleteMonthlyMaterialActionMock.mockClear();
  refreshMock.mockClear();
});

const DEFAULT_PROPS = {
  materialId: "1",
  category: "salesFloorMeeting" as const,
  label: "2026年9月",
  deleteButtonLabel: "削除",
  confirmTitle: "資料の削除",
  confirmMessage: "『2026年9月』の資料を削除します。この操作は取り消せません。よろしいですか？",
  confirmButtonLabel: "削除する",
  cancelButtonLabel: "キャンセル",
  errorMessage: "削除に失敗しました。時間を置いて再度お試しください。",
};

describe("DeleteMonthlyMaterialButton", () => {
  it("トリガー押下で確認モーダルが開き、対象年月を含む本文が表示される", () => {
    render(<DeleteMonthlyMaterialButton {...DEFAULT_PROPS} />);

    expect(screen.queryByText(DEFAULT_PROPS.confirmMessage)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(screen.getByText("資料の削除")).toBeTruthy();
    expect(screen.getByText(DEFAULT_PROPS.confirmMessage)).toBeTruthy();
  });

  it("確認モーダルで確定するとdeleteMonthlyMaterialActionが呼ばれ、一覧を再取得する", async () => {
    render(<DeleteMonthlyMaterialButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(deleteMonthlyMaterialActionMock).toHaveBeenCalledWith("1", "salesFloorMeeting");
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("削除に失敗した場合はエラーメッセージを表示し、再取得しない", async () => {
    deleteMonthlyMaterialActionMock.mockRejectedValueOnce(new Error("failed"));
    render(<DeleteMonthlyMaterialButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(
        screen.getByText("削除に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("確認モーダルをキャンセルするとdeleteMonthlyMaterialActionが呼ばれない", () => {
    render(<DeleteMonthlyMaterialButton {...DEFAULT_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(deleteMonthlyMaterialActionMock).not.toHaveBeenCalled();
    expect(screen.queryByText(DEFAULT_PROPS.confirmMessage)).toBeNull();
  });
});
