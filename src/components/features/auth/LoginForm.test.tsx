import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/features/auth/LoginForm";
import messages from "../../../../messages/ja.json";

function renderLoginForm(loginAction: ReturnType<typeof vi.fn>) {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      <LoginForm role="applicant" locale="ja" loginAction={loginAction as unknown as ComponentProps<typeof LoginForm>["loginAction"]} />
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

  it("loginActionがaccount_lockedを返すとロックのメッセージを表示する", async () => {
    const loginAction = vi.fn().mockResolvedValue({ error: "account_locked" });
    const user = userEvent.setup();
    renderLoginForm(loginAction);

    await user.type(screen.getByLabelText(/メールアドレス/), "applicant@example.com");
    await user.type(screen.getByLabelText(/パスワード/), "wrong-password");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getByText(messages.login.errorAccountLocked)).toBeTruthy();
    });
  });

  it("googleLoginAction未指定ではGoogleログインボタンを表示しない", () => {
    renderLoginForm(vi.fn());
    expect(screen.queryByRole("button", { name: "Googleでログイン" })).toBeNull();
  });

  it("googleLoginAction指定時はボタンを表示し、押すと呼ばれる", async () => {
    const googleLoginAction = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="ja" messages={messages}>
        <LoginForm
          role="applicant"
          locale="ja"
          loginAction={vi.fn()}
          googleLoginAction={googleLoginAction}
        />
      </NextIntlClientProvider>
    );
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));
    await waitFor(() => expect(googleLoginAction).toHaveBeenCalledTimes(1));
  });

  it("googleErrorが渡されると対応する拒否メッセージを表示する", () => {
    render(
      <NextIntlClientProvider locale="ja" messages={messages}>
        <LoginForm
          role="applicant"
          locale="ja"
          loginAction={vi.fn()}
          googleError="not_registered"
        />
      </NextIntlClientProvider>
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "このメールアドレスはポータルに登録されていません"
    );
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
