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

describe("DeleteDocumentButton", () => {
  it("確認して削除するとdeleteDocumentActionが呼ばれる", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    render(
      <DeleteDocumentButton
        documentId="1"
        deleteButtonLabel="削除"
        confirmMessage="このドキュメントを削除しますか？"
        errorMessage="削除に失敗しました。時間を置いて再度お試しください。"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => {
      expect(deleteDocumentActionMock).toHaveBeenCalledWith("1");
    });
    expect(pushMock).toHaveBeenCalledWith("/helpdesk/documents");
  });

  it("削除に失敗した場合はエラーメッセージを表示し、遷移しない", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    deleteDocumentActionMock.mockRejectedValueOnce(new Error("failed"));

    render(
      <DeleteDocumentButton
        documentId="1"
        deleteButtonLabel="削除"
        confirmMessage="このドキュメントを削除しますか？"
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

  it("確認をキャンセルするとdeleteDocumentActionが呼ばれない", () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);

    render(
      <DeleteDocumentButton
        documentId="1"
        deleteButtonLabel="削除"
        confirmMessage="このドキュメントを削除しますか？"
        errorMessage="削除に失敗しました。時間を置いて再度お試しください。"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(deleteDocumentActionMock).not.toHaveBeenCalled();
  });
});
