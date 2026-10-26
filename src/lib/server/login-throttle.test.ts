import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    loginThrottle: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    authEvent: { create: vi.fn() },
  },
}));
vi.mock("next/headers", () => ({
  headers: () => new Headers({ "x-forwarded-for": "203.0.113.45" }),
}));

import { prisma } from "@/lib/db/prisma";
import { MAX_FAILED_ATTEMPTS } from "@/lib/auth/login-throttle-policy";
import { hashIdentifier } from "@/lib/server/auth-audit";
import {
  isLoginLocked,
  runProtectedCredentialsLogin,
} from "@/lib/server/login-throttle";

const EMAIL = "Secret.User@example.com";

function createdEvents() {
  return vi
    .mocked(prisma.authEvent.create)
    .mock.calls.map((c) => (c[0] as { data: Record<string, unknown> }).data);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.mocked(prisma.loginThrottle.findUnique).mockResolvedValue(null);
});

describe("runProtectedCredentialsLogin", () => {
  it("成功時はユーザーを返し、login_successを記録する", async () => {
    const result = await runProtectedCredentialsLogin("applicant", EMAIL, async () => ({
      id: "u1",
    }));
    expect(result).toEqual({ id: "u1" });
    const [event] = createdEvents();
    expect(event).toMatchObject({
      type: "login_success",
      portal: "applicant",
      userId: "u1",
      ipSummary: "203.0.113.0/24",
    });
    expect(prisma.loginThrottle.upsert).not.toHaveBeenCalled();
  });

  it("成功時は既存の失敗カウンタをリセットする", async () => {
    vi.mocked(prisma.loginThrottle.findUnique).mockResolvedValue({
      failedCount: 2,
      lastFailedAt: new Date(),
      lockedUntil: null,
    } as never);
    await runProtectedCredentialsLogin("helpdesk", EMAIL, async () => ({ id: "s1" }));
    expect(prisma.loginThrottle.deleteMany).toHaveBeenCalled();
  });

  it("失敗時はnullを返し、カウントとlogin_failureを記録する", async () => {
    const result = await runProtectedCredentialsLogin("applicant", EMAIL, async () => null);
    expect(result).toBeNull();
    expect(prisma.loginThrottle.upsert).toHaveBeenCalledTimes(1);
    expect(createdEvents().map((e) => e.type)).toEqual(["login_failure"]);
  });

  it("閾値到達の失敗でlogin_lockedも記録する", async () => {
    vi.mocked(prisma.loginThrottle.findUnique).mockResolvedValue({
      failedCount: MAX_FAILED_ATTEMPTS - 1,
      lastFailedAt: new Date(),
      lockedUntil: null,
    } as never);
    await runProtectedCredentialsLogin("applicant", EMAIL, async () => null);
    expect(createdEvents().map((e) => e.type)).toEqual(["login_failure", "login_locked"]);
  });

  it("ロック中は認証処理を実行せずnullを返し、login_blockedを記録する", async () => {
    vi.mocked(prisma.loginThrottle.findUnique).mockResolvedValue({
      failedCount: 0,
      lastFailedAt: new Date(),
      lockedUntil: new Date(Date.now() + 60_000),
    } as never);
    const authorize = vi.fn().mockResolvedValue({ id: "u1" });
    const result = await runProtectedCredentialsLogin("applicant", EMAIL, authorize);
    expect(result).toBeNull();
    expect(authorize).not.toHaveBeenCalled();
    expect(createdEvents().map((e) => e.type)).toEqual(["login_blocked"]);
  });

  it("監査ログ・ロック台帳・構造化ログにメールアドレスを平文で残さない", async () => {
    await runProtectedCredentialsLogin("applicant", EMAIL, async () => null);
    const serialized = JSON.stringify([
      createdEvents(),
      vi.mocked(prisma.loginThrottle.upsert).mock.calls,
      vi.mocked(console.info).mock.calls,
    ]).toLowerCase();
    expect(serialized).not.toContain("secret.user");
    expect(serialized).not.toContain("example.com");
    expect(serialized).toContain(hashIdentifier(EMAIL));
  });

  it("監査ログの書き込み失敗でもログイン結果に影響しない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.authEvent.create).mockRejectedValue(new Error("db"));
    const result = await runProtectedCredentialsLogin("applicant", EMAIL, async () => ({
      id: "u1",
    }));
    expect(result).toEqual({ id: "u1" });
  });
});

describe("isLoginLocked / hashIdentifier", () => {
  it("lockedUntilが未来ならtrue", async () => {
    vi.mocked(prisma.loginThrottle.findUnique).mockResolvedValue({
      failedCount: 0,
      lastFailedAt: new Date(),
      lockedUntil: new Date(Date.now() + 60_000),
    } as never);
    expect(await isLoginLocked("applicant", EMAIL)).toBe(true);
  });

  it("識別子ハッシュは大文字小文字・前後空白を無視して一致する", () => {
    expect(hashIdentifier("  A@Example.com ")).toBe(hashIdentifier("a@example.com"));
  });
});
