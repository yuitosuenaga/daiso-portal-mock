import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToggleApplicantUserActiveButton } from "@/components/features/helpdesk-companies/ToggleApplicantUserActiveButton";

const setApplicantUserActiveActionMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/actions/applicant-users", () => ({
  setApplicantUserActiveAction: (...args: unknown[]) =>
    setApplicantUserActiveActionMock(...args),
}));

const labels = {
  deactivateButtonLabel: "無効化する",
  activateButtonLabel: "再有効化する",
  deactivateConfirmMessage: "このアカウントを無効化しますか？",
  activateConfirmMessage: "このアカウントを再有効化しますか？",
  errorMessage: "更新に失敗しました。時間を置いて再度お試しください。",
};

beforeEach(() => {
  setApplicantUserActiveActionMock.mockClear();
});

describe("ToggleApplicantUserActiveButton", () => {
  it("有効なアカウントで確認して無効化を実行すると、falseを渡してアクションが呼ばれる", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    render(
      <ToggleApplicantUserActiveButton
        applicantUserId="applicant-1"
        isActive={true}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "無効化する" }));

    await waitFor(() => {
      expect(setApplicantUserActiveActionMock).toHaveBeenCalledWith(
        "applicant-1",
        false
      );
    });
  });

  it("無効なアカウントで確認して再有効化を実行すると、trueを渡してアクションが呼ばれる", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    render(
      <ToggleApplicantUserActiveButton
        applicantUserId="applicant-1"
        isActive={false}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "再有効化する" }));

    await waitFor(() => {
      expect(setApplicantUserActiveActionMock).toHaveBeenCalledWith(
        "applicant-1",
        true
      );
    });
  });

  it("確認をキャンセルするとアクションが呼ばれない", () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);

    render(
      <ToggleApplicantUserActiveButton
        applicantUserId="applicant-1"
        isActive={true}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "無効化する" }));

    expect(setApplicantUserActiveActionMock).not.toHaveBeenCalled();
  });

  it("更新に失敗した場合はエラーメッセージを表示する", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    setApplicantUserActiveActionMock.mockRejectedValueOnce(new Error("failed"));

    render(
      <ToggleApplicantUserActiveButton
        applicantUserId="applicant-1"
        isActive={true}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "無効化する" }));

    await waitFor(() => {
      expect(
        screen.getByText("更新に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
  });
});
