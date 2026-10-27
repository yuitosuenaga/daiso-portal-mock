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
vi.mock("@/lib/server/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/server/google-login-config", () => ({
  getAllowedEmailDomains: () => ["example.com"],
  getHelpdeskAutoProvisionDomains: () => ["example.com"],
  isGoogleLoginEnabled: () => false,
}));

import "@/auth";
import { GOOGLE_LOGIN_CONTEXT_COOKIE } from "@/lib/constants/google-login";
import { recordAuthEvent } from "@/lib/server/auth-audit";
import { authorizeGoogleLogin } from "@/lib/server/google-authorize";
import { logger } from "@/lib/server/logger";

type SignInArgs = {
  user: Record<string, unknown>;
  account: { provider: string } | null;
  profile?: {
    email?: string;
    email_verified?: boolean;
    hd?: unknown;
    name?: unknown;
  };
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
      provisioned: false,
    } as never);
    const user: Record<string, unknown> = { name: "G", image: "x" };

    const result = await signInCallback({
      user,
      account: { provider: "google" },
      profile: {
        email: "staff@example.com",
        email_verified: true,
        hd: "example.com",
        name: "田中 太郎",
      },
    });

    expect(result).toBe(true);
    expect(cookieGet).toHaveBeenCalledWith(GOOGLE_LOGIN_CONTEXT_COOKIE);
    expect(authorizeGoogleLogin).toHaveBeenCalledWith({
      email: "staff@example.com",
      emailVerified: true,
      portal: "helpdesk",
      allowedDomains: ["example.com"],
      hostedDomain: "example.com",
      name: "田中 太郎",
      autoProvisionDomains: ["example.com"],
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
    // 自動作成でなければaccount_provisionedは記録しない
    expect(recordAuthEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "account_provisioned" })
    );
  });

  it("自動作成されたときaccount_provisionedをlogin_successより先に記録する", async () => {
    cookieGet.mockReturnValue({ value: "helpdesk:ja" });
    vi.mocked(authorizeGoogleLogin).mockResolvedValue({
      ok: true,
      user: { id: "s2", role: "helpdesk", staffId: "s2" },
      provisioned: true,
    } as never);

    const result = await signInCallback({
      user: {},
      account: { provider: "google" },
      profile: { email: "new@example.com", email_verified: true, hd: "example.com" },
    });

    expect(result).toBe(true);
    const calls = vi.mocked(recordAuthEvent).mock.calls.map((c) => c[0]);
    expect(calls.map((c) => c.type)).toEqual(["account_provisioned", "login_success"]);
    expect(calls[0]).toMatchObject({
      method: "google",
      portal: "helpdesk",
      userId: "s2",
      identifierHash: "hash:new@example.com",
      reason: "google_auto",
    });
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

  it("hd/nameが文字列でない場合はnullとして渡す（型を信用しない）", async () => {
    cookieGet.mockReturnValue({ value: "helpdesk:en" });
    vi.mocked(authorizeGoogleLogin).mockResolvedValue({
      ok: false,
      error: "not_registered",
    } as never);

    await signInCallback({
      user: {},
      account: { provider: "google" },
      profile: {
        email: "a@example.com",
        email_verified: true,
        hd: 123,
        name: { evil: true },
      },
    });

    expect(authorizeGoogleLogin).toHaveBeenCalledWith(
      expect.objectContaining({ hostedDomain: null, name: null })
    );
  });

  it("authorizeGoogleLoginが例外を投げたら拒否してlogin_failureを記録する（メール平文は記録しない）", async () => {
    cookieGet.mockReturnValue({ value: "helpdesk:en" });
    vi.mocked(authorizeGoogleLogin).mockRejectedValue(new Error("db down a@example.com"));

    const result = await signInCallback({
      user: {},
      account: { provider: "google" },
      profile: { email: "a@example.com", email_verified: true, hd: "example.com" },
    });

    expect(result).toBe("/en/helpdesk/login?googleError=not_registered");
    expect(recordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "login_failure",
        method: "google",
        portal: "helpdesk",
        identifierHash: "hash:a@example.com",
        reason: "authorize_error",
      })
    );
    expect(recordAuthEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "login_success" })
    );
    expect(logger.error).toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(
      "a@example.com"
    );
  });
});
