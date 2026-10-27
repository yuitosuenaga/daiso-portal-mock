import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToggleStaffActiveButton } from "@/components/features/helpdesk-staff/ToggleStaffActiveButton";

const actionMock = vi.fn();
vi.mock("@/lib/actions/helpdesk-staff", () => ({
  setHelpdeskStaffActiveAction: (...args: unknown[]) => actionMock(...args),
}));

const labels = {
  deactivateButton: "無効化する",
  activateButton: "再有効化する",
  deactivateConfirmTitle: "スタッフの無効化",
  activateConfirmTitle: "スタッフの再有効化",
  deactivateConfirm: "『{name}』を無効化します。担当中の問い合わせは解除されません。",
  activateConfirm: "『{name}』を再有効化します。",
  deactivateConfirmButton: "無効化を実行",
  activateConfirmButton: "再有効化を実行",
  cancelButton: "キャンセル",
};
const errors = {
  self: "自分自身は不可",
  lastAdmin: "最後の管理者は不可",
  notFound: "見つかりません",
  generic: "更新に失敗しました",
};

function renderButton(isActive: boolean, disabled = false) {
  render(
    <ToggleStaffActiveButton
      staffId="s1"
      staffName="山田"
      isActive={isActive}
      disabled={disabled}
      labels={labels}
      errors={errors}
    />
  );
}

beforeEach(() => {
  actionMock.mockReset();
  actionMock.mockResolvedValue({ ok: true });
});

describe("ToggleStaffActiveButton", () => {
  it("有効なスタッフは、担当中の問い合わせ注記を含む確認後にfalseでアクションを呼ぶ", async () => {
    renderButton(true);
    fireEvent.click(screen.getByRole("button", { name: "無効化する" }));
    expect(
      screen.getByText("『山田』を無効化します。担当中の問い合わせは解除されません。")
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "無効化を実行" }));
    await waitFor(() => expect(actionMock).toHaveBeenCalledWith("s1", false));
  });

  it("無効なスタッフは再有効化の確認後にtrueでアクションを呼ぶ", async () => {
    renderButton(false);
    fireEvent.click(screen.getByRole("button", { name: "再有効化する" }));
    fireEvent.click(screen.getByRole("button", { name: "再有効化を実行" }));
    await waitFor(() => expect(actionMock).toHaveBeenCalledWith("s1", true));
  });

  it("キャンセルしたらアクションを呼ばない", () => {
    renderButton(true);
    fireEvent.click(screen.getByRole("button", { name: "無効化する" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(actionMock).not.toHaveBeenCalled();
  });

  it.each([
    ["self", "自分自身は不可"],
    ["lastAdmin", "最後の管理者は不可"],
    ["notFound", "見つかりません"],
  ])("reason=%s のときは対応する文言を表示する", async (reason, message) => {
    actionMock.mockResolvedValue({ ok: false, reason });
    renderButton(true);
    fireEvent.click(screen.getByRole("button", { name: "無効化する" }));
    fireEvent.click(screen.getByRole("button", { name: "無効化を実行" }));
    expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
  });

  it("例外時は汎用エラー文言を表示する", async () => {
    actionMock.mockRejectedValue(new Error("boom"));
    renderButton(true);
    fireEvent.click(screen.getByRole("button", { name: "無効化する" }));
    fireEvent.click(screen.getByRole("button", { name: "無効化を実行" }));
    expect((await screen.findAllByText("更新に失敗しました")).length).toBeGreaterThan(0);
  });

  it("disabled のときはトリガーが押せない", () => {
    renderButton(true, true);
    expect((screen.getByRole("button", { name: "無効化する" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
