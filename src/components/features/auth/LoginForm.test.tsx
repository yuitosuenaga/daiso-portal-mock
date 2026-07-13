import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/features/auth/LoginForm";
import messages from "../../../../messages/ja.json";

function renderLoginForm(loginAction: ReturnType<typeof vi.fn>) {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      <LoginForm role="applicant" locale="ja" loginAction={loginAction} />
    </NextIntlClientProvider>
  );
}

describe("LoginForm", () => {
  it("メールアドレス・パスワードを入力して送信するとloginActionが呼ばれる", async () => {
    const loginAction = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLoginForm(loginAction);

    await user.type(screen.getByLabelText(/メールアドレス/), "applicant@example.com");
    await user.type(screen.getByLabelText(/パスワード/), "password1234");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(loginAction).toHaveBeenCalledWith({
        email: "applicant@example.com",
        password: "password1234",
        locale: "ja",
      });
    });
  });

  it("loginActionがエラーを返すとエラーメッセージを表示する", async () => {
    const loginAction = vi.fn().mockResolvedValue({ error: "invalid_credentials" });
    const user = userEvent.setup();
    renderLoginForm(loginAction);

    await user.type(screen.getByLabelText(/メールアドレス/), "applicant@example.com");
    await user.type(screen.getByLabelText(/パスワード/), "wrong-password");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(
        screen.getByText("メールアドレスまたはパスワードが正しくありません。")
      ).toBeTruthy();
    });
  });

  it("未入力のまま送信するとloginActionが呼ばれない", async () => {
    const loginAction = vi.fn();
    const user = userEvent.setup();
    renderLoginForm(loginAction);

    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
    expect(loginAction).not.toHaveBeenCalled();
  });
});
