import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => {
  class MockAuthError extends Error {}
  return { AuthError: MockAuthError };
});
vi.mock("@/auth", () => ({
  signIn: vi.fn(),
}));

import { AuthError as MockAuthError } from "next-auth";
import { signIn } from "@/auth";
import { applicantLoginAction, helpdeskLoginAction } from "@/lib/actions/auth";

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
