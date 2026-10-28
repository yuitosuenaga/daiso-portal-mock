import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => {
  class MockAuthError extends Error {}
  return { AuthError: MockAuthError };
});
vi.mock("@/auth", () => ({
  signIn: vi.fn(),
}));

const cookieSet = vi.fn();
// cookies()はNext 15以降Promiseを返す。awaitして初めて`.set`が使えることを検証する
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set: cookieSet }),
}));
const googleEnabled = vi.hoisted(() => ({ value: true }));
vi.mock("@/lib/server/google-login-config", () => ({
  isGoogleLoginEnabled: () => googleEnabled.value,
}));

vi.mock("@/lib/server/login-throttle", () => ({
  isLoginLocked: vi.fn().mockResolvedValue(false),
}));

import { isLoginLocked } from "@/lib/server/login-throttle";
import { AuthError as MockAuthError } from "next-auth";
import { signIn } from "@/auth";
import {
  applicantLoginAction,
  googleLoginAction,
  helpdeskLoginAction,
} from "@/lib/actions/auth";

describe("applicantLoginAction", () => {
  it("有効な認証情報のとき、applicant-credentialsでsignInを呼び出しエラーを返さない", async () => {
    vi.mocked(signIn).mockResolvedValue(undefined as never);

    const result = await applicantLoginAction({
      email: "applicant@example.com",
      password: "password1234",
      locale: "ja",
    });

    expect(signIn).toHaveBeenCalledWith(
      "applicant-credentials",
      expect.objectContaining({
        email: "applicant@example.com",
        password: "password1234",
        redirectTo: "/ja",
      })
    );
    expect(result).toBeUndefined();
  });

  it("認証エラーのとき、例外を送出せずエラー結果を返す", async () => {
    vi.mocked(signIn).mockRejectedValue(new MockAuthError("CredentialsSignin"));

    const result = await applicantLoginAction({
      email: "applicant@example.com",
      password: "wrong",
      locale: "ja",
    });

    expect(result).toEqual({ error: "invalid_credentials" });
  });

  it("認証エラーかつロック中のとき、account_lockedを返す", async () => {
    vi.mocked(signIn).mockRejectedValue(new MockAuthError("CredentialsSignin"));
    vi.mocked(isLoginLocked).mockResolvedValueOnce(true);

    const result = await applicantLoginAction({
      email: "applicant@example.com",
      password: "wrong",
      locale: "ja",
    });

    expect(isLoginLocked).toHaveBeenCalledWith("applicant", "applicant@example.com");
    expect(result).toEqual({ error: "account_locked" });
  });

  it("ヘルプデスクでもロック中はaccount_lockedを返す", async () => {
    vi.mocked(signIn).mockRejectedValue(new MockAuthError("CredentialsSignin"));
    vi.mocked(isLoginLocked).mockResolvedValueOnce(true);

    const result = await helpdeskLoginAction({
      email: "staff@example.com",
      password: "wrong",
      locale: "ja",
    });

    expect(isLoginLocked).toHaveBeenCalledWith("helpdesk", "staff@example.com");
    expect(result).toEqual({ error: "account_locked" });
  });

  it("認証以外のエラーは再送出する", async () => {
    vi.mocked(signIn).mockRejectedValue(new Error("db down"));

    await expect(
      applicantLoginAction({
        email: "applicant@example.com",
        password: "password1234",
        locale: "ja",
      })
    ).rejects.toThrow("db down");
  });
});

describe("helpdeskLoginAction", () => {
  it("有効な認証情報のとき、helpdesk-credentialsでsignInを呼び出す", async () => {
    vi.mocked(signIn).mockResolvedValue(undefined as never);

    const result = await helpdeskLoginAction({
      email: "staff@example.com",
      password: "password1234",
      locale: "en",
    });

    expect(signIn).toHaveBeenCalledWith(
      "helpdesk-credentials",
      expect.objectContaining({
        email: "staff@example.com",
        password: "password1234",
        redirectTo: "/en/helpdesk",
      })
    );
    expect(result).toBeUndefined();
  });

  it("認証エラーのとき、エラー結果を返す", async () => {
    vi.mocked(signIn).mockRejectedValue(new MockAuthError("CredentialsSignin"));

    const result = await helpdeskLoginAction({
      email: "staff@example.com",
      password: "wrong",
      locale: "en",
    });

    expect(result).toEqual({ error: "invalid_credentials" });
  });
});

describe("googleLoginAction", () => {
  beforeEach(() => {
    cookieSet.mockClear();
    vi.mocked(signIn).mockReset();
    vi.mocked(signIn).mockResolvedValue(undefined as never);
    googleEnabled.value = true;
  });

  it("async cookies()経由で文脈cookieを元のオプションでsetし、googleのsignInを呼ぶ", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await googleLoginAction({ portal: "helpdesk", locale: "en" });

    expect(cookieSet).toHaveBeenCalledWith(
      "portal_google_login_context",
      "helpdesk:en",
      {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 600,
      }
    );
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/en/helpdesk" });
  });

  it("本番以外ではsecureがfalseになる", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await googleLoginAction({ portal: "applicant", locale: "ja" });

    expect(cookieSet).toHaveBeenCalledWith(
      "portal_google_login_context",
      "applicant:ja",
      expect.objectContaining({ secure: false, httpOnly: true, maxAge: 600 })
    );
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/ja" });
  });

  it("未対応localeは既定ロケールに置き換える", async () => {
    await googleLoginAction({ portal: "applicant", locale: "zz" });
    const [, value] = cookieSet.mock.calls[0];
    expect(value).toMatch(/^applicant:[a-z]{2}$/);
    expect(value).not.toContain("zz");
  });

  it("Googleログイン無効時はcookieもsignInも呼ばない", async () => {
    googleEnabled.value = false;
    await googleLoginAction({ portal: "applicant", locale: "ja" });
    expect(cookieSet).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });
});
