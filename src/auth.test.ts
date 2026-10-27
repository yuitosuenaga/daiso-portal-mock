import { beforeEach, describe, expect, it, vi } from "vitest";

const { captured, cookieGet } = vi.hoisted(() => ({
  captured: { config: undefined as undefined | Record<string, unknown> },
  cookieGet: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: (config: Record<string, unknown>) => {
    captured.config = config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("next-auth/providers/credentials", () => ({ default: vi.fn(() => ({})) }));
vi.mock("next-auth/providers/google", () => ({ default: vi.fn(() => ({})) }));
// cookies()はNext 15以降Promiseを返す。awaitしないと`.get`が存在せず落ちることで検証する
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: cookieGet }),
}));
vi.mock("@/auth.config", () => ({ authConfig: { callbacks: {}, providers: [] } }));
vi.mock("@/lib/server/authorize", () => ({
  authorizeApplicantCredentials: vi.fn(),
  authorizeHelpdeskCredentials: vi.fn(),
}));
vi.mock("@/lib/server/auth-audit", () => ({
  recordAuthEvent: vi.fn(),
  hashIdentifier: (email: string) => `hash:${email}`,
}));
vi.mock("@/lib/server/login-throttle", () => ({
  runProtectedCredentialsLogin: vi.fn(),
}));
vi.mock("@/lib/server/google-authorize", () => ({
  authorizeGoogleLogin: vi.fn(),
}));
vi.mock("@/lib/server/google-login-config", () => ({
  getAllowedEmailDomains: () => ["example.com"],
  isGoogleLoginEnabled: () => false,
}));

import "@/auth";
import { GOOGLE_LOGIN_CONTEXT_COOKIE } from "@/lib/constants/google-login";
import { recordAuthEvent } from "@/lib/server/auth-audit";
import { authorizeGoogleLogin } from "@/lib/server/google-authorize";

type SignInArgs = {
  user: Record<string, unknown>;
  account: { provider: string } | null;
  profile?: { email?: string; email_verified?: boolean };
};
function signInCallback(args: SignInArgs) {
  const callbacks = captured.config?.callbacks as {
    signIn: (a: SignInArgs) => Promise<unknown>;
  };
  return callbacks.signIn(args);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("auth.ts signIn callback（Googleログイン）", () => {
  it("google以外のproviderではcookieを読まずtrueを返す", async () => {
    const result = await signInCallback({
      user: {},
      account: { provider: "applicant-credentials" },
    });
    expect(result).toBe(true);
    expect(cookieGet).not.toHaveBeenCalled();
    expect(authorizeGoogleLogin).not.toHaveBeenCalled();
  });

  it("async cookies()をawaitして文脈cookieを読み、portalをauthorizeGoogleLoginへ渡す", async () => {
    cookieGet.mockReturnValue({ value: "helpdesk:en" });
    vi.mocked(authorizeGoogleLogin).mockResolvedValue({
      ok: true,
      user: { id: "s1", role: "helpdesk", staffId: "s1" },
    } as never);
    const user: Record<string, unknown> = { name: "G", image: "x" };

    const result = await signInCallback({
      user,
      account: { provider: "google" },
      profile: { email: "staff@example.com", email_verified: true },
    });

    expect(result).toBe(true);
    expect(cookieGet).toHaveBeenCalledWith(GOOGLE_LOGIN_CONTEXT_COOKIE);
    expect(authorizeGoogleLogin).toHaveBeenCalledWith({
      email: "staff@example.com",
      emailVerified: true,
      portal: "helpdesk",
      allowedDomains: ["example.com"],
    });
    expect(recordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "login_success",
        method: "google",
        portal: "helpdesk",
        userId: "s1",
      })
    );
    // Googleのプロフィール項目は消え、認可済みユーザーに置き換わる
    expect(user).toEqual({ id: "s1", role: "helpdesk", staffId: "s1" });
  });

  it("許可外ドメイン等で拒否された場合、cookieのlocale/portalに応じたエラーパスを返す", async () => {
    cookieGet.mockReturnValue({ value: "helpdesk:en" });
    vi.mocked(authorizeGoogleLogin).mockResolvedValue({
      ok: false,
      error: "domain_not_allowed",
    } as never);

    const result = await signInCallback({
      user: {},
      account: { provider: "google" },
      profile: { email: "x@evil.com", email_verified: true },
    });

    expect(result).toBe("/en/helpdesk/login?googleError=domain_not_allowed");
    expect(recordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "login_failure",
        method: "google",
        portal: "helpdesk",
        reason: "domain_not_allowed",
      })
    );
  });

  it("cookieが無い場合は申請者・既定ロケールとして扱う", async () => {
    cookieGet.mockReturnValue(undefined);
    vi.mocked(authorizeGoogleLogin).mockResolvedValue({
      ok: false,
      error: "not_registered",
    } as never);

    const result = await signInCallback({
      user: {},
      account: { provider: "google" },
      profile: { email: "a@example.com", email_verified: true },
    });

    expect(authorizeGoogleLogin).toHaveBeenCalledWith(
      expect.objectContaining({ portal: "applicant" })
    );
    expect(result).toMatch(/^\/[a-z]{2}\/login\?googleError=not_registered$/);
  });
});
