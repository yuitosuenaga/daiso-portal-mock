import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StaffForm } from "@/components/features/helpdesk-staff/StaffForm";

const createActionMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/actions/helpdesk-staff", () => ({
  createHelpdeskStaffAction: (...args: unknown[]) => createActionMock(...args),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const labels = {
  emailLabel: "メールアドレス",
  emailPlaceholder: "メール入力",
  displayNameLabel: "表示名",
  displayNamePlaceholder: "表示名入力",
  passwordLabel: "パスワード（任意）",
  passwordPlaceholder: "パスワード入力",
  passwordHint: "空欄ならGoogle専用",
  roleLabel: "ロール",
  roleOptions: [
    { value: "member", label: "メンバー" },
    { value: "admin", label: "管理者" },
  ],
  submitButtonLabel: "作成する",
  requiredErrorMessage: "必須です",
  emailInvalidMessage: "メール不正",
  emailDuplicateMessage: "メール重複",
  passwordTooShortMessage: "8文字以上",
  submitErrorMessage: "保存失敗",
};

function fill(email: string, name: string, password = "") {
  fireEvent.change(screen.getByLabelText("メールアドレス"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("表示名"), { target: { value: name } });
  if (password) {
    fireEvent.change(screen.getByLabelText("パスワード（任意）"), { target: { value: password } });
  }
}

beforeEach(() => {
  createActionMock.mockReset();
  pushMock.mockReset();
});

describe("StaffForm", () => {
  it("必須項目が未入力ならアクションを呼ばない", async () => {
    render(<StaffForm {...labels} />);
    fireEvent.click(screen.getByRole("button", { name: "作成する" }));
    expect(await screen.findByText("必須です")).toBeTruthy();
    expect(createActionMock).not.toHaveBeenCalled();
  });

  it("パスワード空欄・既定ロールmemberで作成し、成功したら一覧へ戻る", async () => {
    createActionMock.mockResolvedValue({ ok: true });
    render(<StaffForm {...labels} />);
    fill("new@example.com", "新人");
    fireEvent.click(screen.getByRole("button", { name: "作成する" }));
    await waitFor(() =>
      expect(createActionMock).toHaveBeenCalledWith({
        email: "new@example.com",
        displayName: "新人",
        password: "",
        role: "member",
      })
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/helpdesk/staff"));
  });

  it("ロールをadminに選んで作成できる", async () => {
    createActionMock.mockResolvedValue({ ok: true });
    render(<StaffForm {...labels} />);
    fill("new@example.com", "新人", "password123");
    fireEvent.change(screen.getByLabelText("ロール"), { target: { value: "admin" } });
    fireEvent.click(screen.getByRole("button", { name: "作成する" }));
    await waitFor(() =>
      expect(createActionMock).toHaveBeenCalledWith(
        expect.objectContaining({ password: "password123", role: "admin" })
      )
    );
  });

  it("パスワードが短い場合はアクションを呼ばず文言を表示する", async () => {
    render(<StaffForm {...labels} />);
    fill("new@example.com", "新人", "short");
    fireEvent.click(screen.getByRole("button", { name: "作成する" }));
    expect(await screen.findByText("8文字以上")).toBeTruthy();
    expect(createActionMock).not.toHaveBeenCalled();
  });

  it("emailTakenならメール欄に重複エラーを表示し、遷移しない", async () => {
    createActionMock.mockResolvedValue({ ok: false, reason: "emailTaken" });
    render(<StaffForm {...labels} />);
    fill("dup@example.com", "重複", "password123");
    fireEvent.click(screen.getByRole("button", { name: "作成する" }));
    expect(await screen.findByText("メール重複")).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();
    expect((screen.getByLabelText("パスワード（任意）") as HTMLInputElement).value).toBe("");
  });

  it("想定外の失敗では保存失敗の文言を表示する", async () => {
    createActionMock.mockRejectedValue(new Error("boom"));
    render(<StaffForm {...labels} />);
    fill("new@example.com", "新人");
    fireEvent.click(screen.getByRole("button", { name: "作成する" }));
    expect(await screen.findByText("保存失敗")).toBeTruthy();
  });
});
