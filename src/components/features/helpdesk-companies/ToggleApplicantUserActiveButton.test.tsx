import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToggleApplicantUserActiveButton } from "@/components/features/helpdesk-companies/ToggleApplicantUserActiveButton";

const setApplicantUserActiveActionMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/actions/applicant-users", () => ({
  setApplicantUserActiveAction: (...args: unknown[]) =>
    setApplicantUserActiveActionMock(...args),
}));

const labels = {
  applicantUserName: "田中太郎",
  deactivateButtonLabel: "無効化する",
  activateButtonLabel: "再有効化する",
  deactivateConfirmTitle: "アカウントの無効化",
  activateConfirmTitle: "アカウントの再有効化",
  deactivateConfirmMessage:
    "『田中太郎』を無効化します。無効化するとこのアカウントでログインできなくなります。よろしいですか？",
  activateConfirmMessage:
    "『田中太郎』を再有効化します。再有効化すると再びログインできるようになります。よろしいですか？",
  deactivateConfirmButtonLabel: "無効化を実行",
  activateConfirmButtonLabel: "再有効化を実行",
  cancelButtonLabel: "キャンセル",
  errorMessage: "更新に失敗しました。時間を置いて再度お試しください。",
};

beforeEach(() => {
  setApplicantUserActiveActionMock.mockClear();
});

describe("ToggleApplicantUserActiveButton", () => {
  it("有効なアカウントでトリガー押下すると、対象氏名を含む無効化確認モーダルが表示される", () => {
    render(
      <ToggleApplicantUserActiveButton
        applicantUserId="applicant-1"
        isActive={true}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "無効化する" }));

    expect(screen.getByText("アカウントの無効化")).toBeTruthy();
    expect(screen.getByText(labels.deactivateConfirmMessage)).toBeTruthy();
  });

  it("有効なアカウントで確認して無効化を実行すると、falseを渡してアクションが呼ばれる", async () => {
    render(
      <ToggleApplicantUserActiveButton
        applicantUserId="applicant-1"
        isActive={true}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "無効化する" }));
    fireEvent.click(screen.getByRole("button", { name: "無効化を実行" }));

    await waitFor(() => {
      expect(setApplicantUserActiveActionMock).toHaveBeenCalledWith(
        "applicant-1",
        false
      );
    });
  });

  it("無効なアカウントでトリガー押下すると、対象氏名を含む再有効化確認モーダルが表示される", () => {
    render(
      <ToggleApplicantUserActiveButton
        applicantUserId="applicant-1"
        isActive={false}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "再有効化する" }));

    expect(screen.getByText("アカウントの再有効化")).toBeTruthy();
    expect(screen.getByText(labels.activateConfirmMessage)).toBeTruthy();
  });

  it("無効なアカウントで確認して再有効化を実行すると、trueを渡してアクションが呼ばれる", async () => {
    render(
      <ToggleApplicantUserActiveButton
        applicantUserId="applicant-1"
        isActive={false}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "再有効化する" }));
    fireEvent.click(screen.getByRole("button", { name: "再有効化を実行" }));

    await waitFor(() => {
      expect(setApplicantUserActiveActionMock).toHaveBeenCalledWith(
        "applicant-1",
        true
      );
    });
  });

  it("確認モーダルをキャンセルするとアクションが呼ばれない", () => {
    render(
      <ToggleApplicantUserActiveButton
        applicantUserId="applicant-1"
        isActive={true}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "無効化する" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(setApplicantUserActiveActionMock).not.toHaveBeenCalled();
  });

  it("更新に失敗した場合はエラーメッセージを表示する", async () => {
    setApplicantUserActiveActionMock.mockRejectedValueOnce(new Error("failed"));

    render(
      <ToggleApplicantUserActiveButton
        applicantUserId="applicant-1"
        isActive={true}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "無効化する" }));
    fireEvent.click(screen.getByRole("button", { name: "無効化を実行" }));

    await waitFor(() => {
      expect(
        screen.getByText("更新に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
  });
});
