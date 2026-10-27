import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToggleStaffRoleButton } from "@/components/features/helpdesk-staff/ToggleStaffRoleButton";

const actionMock = vi.fn();
vi.mock("@/lib/actions/helpdesk-staff", () => ({
  setHelpdeskStaffRoleAction: (...args: unknown[]) => actionMock(...args),
}));

const labels = {
  promoteButton: "管理者にする",
  demoteButton: "メンバーにする",
  promoteConfirmTitle: "管理者への変更",
  demoteConfirmTitle: "メンバーへの変更",
  promoteConfirm: "『{name}』を管理者にします。",
  demoteConfirm: "『{name}』をメンバーにします。",
  promoteConfirmButton: "管理者にする実行",
  demoteConfirmButton: "メンバーにする実行",
  cancelButton: "キャンセル",
};
const errors = {
  self: "自分自身は不可",
  lastAdmin: "最後の管理者は不可",
  notFound: "見つかりません",
  invalid: "入力が不正です",
  generic: "更新に失敗しました",
};

function renderButton(role: "admin" | "member", disabled = false) {
  render(
    <ToggleStaffRoleButton
      staffId="s1"
      staffName="山田"
      role={role}
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

describe("ToggleStaffRoleButton", () => {
  it("memberには昇格ボタンを出し、確認後にadminでアクションを呼ぶ", async () => {
    renderButton("member");
    fireEvent.click(screen.getByRole("button", { name: "管理者にする" }));
    expect(screen.getByText("『山田』を管理者にします。")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "管理者にする実行" }));
    await waitFor(() => expect(actionMock).toHaveBeenCalledWith("s1", "admin"));
  });

  it("adminには降格ボタンを出し、確認後にmemberでアクションを呼ぶ", async () => {
    renderButton("admin");
    fireEvent.click(screen.getByRole("button", { name: "メンバーにする" }));
    fireEvent.click(screen.getByRole("button", { name: "メンバーにする実行" }));
    await waitFor(() => expect(actionMock).toHaveBeenCalledWith("s1", "member"));
  });

  it("キャンセルしたらアクションを呼ばない", () => {
    renderButton("member");
    fireEvent.click(screen.getByRole("button", { name: "管理者にする" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(actionMock).not.toHaveBeenCalled();
  });

  it.each([
    ["self", "自分自身は不可"],
    ["lastAdmin", "最後の管理者は不可"],
    ["notFound", "見つかりません"],
    ["invalid", "入力が不正です"],
  ])("reason=%s のときは対応する文言を表示する", async (reason, message) => {
    actionMock.mockResolvedValue({ ok: false, reason });
    renderButton("admin");
    fireEvent.click(screen.getByRole("button", { name: "メンバーにする" }));
    fireEvent.click(screen.getByRole("button", { name: "メンバーにする実行" }));
    expect((await screen.findByRole("alert")).textContent).toBe(message);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("例外時は汎用エラー文言を表示する", async () => {
    actionMock.mockRejectedValue(new Error("boom"));
    renderButton("admin");
    fireEvent.click(screen.getByRole("button", { name: "メンバーにする" }));
    fireEvent.click(screen.getByRole("button", { name: "メンバーにする実行" }));
    expect((await screen.findByRole("alert")).textContent).toBe("更新に失敗しました");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("disabled のときはトリガーが押せない", () => {
    renderButton("member", true);
    expect((screen.getByRole("button", { name: "管理者にする" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
