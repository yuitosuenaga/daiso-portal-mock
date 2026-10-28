import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    loginThrottle: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    authEvent: { create: vi.fn() },
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.45" }),
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
  vi.spyOn(process.stdout, "write").mockReturnValue(true);
  vi.mocked(prisma.loginThrottle.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ lockedUntil: null }] as never);
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
    // 予約は照合の前に必ず1回行う
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("成功時は（予約で必ず行があるため）無条件でカウンタを削除する", async () => {
    await runProtectedCredentialsLogin("helpdesk", EMAIL, async () => ({ id: "s1" }));
    expect(prisma.loginThrottle.deleteMany).toHaveBeenCalledWith({
      where: { key: `helpdesk:${hashIdentifier(EMAIL)}` },
    });
  });

  it("5回目の予約で成功した場合は削除でロックを解除し、login_lockedは記録しない", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { lockedUntil: new Date(Date.now() + 60_000) },
    ] as never);
    const result = await runProtectedCredentialsLogin("applicant", EMAIL, async () => ({
      id: "u1",
    }));
    expect(result).toEqual({ id: "u1" });
    expect(prisma.loginThrottle.deleteMany).toHaveBeenCalled();
    expect(createdEvents().map((e) => e.type)).toEqual(["login_success"]);
  });

  it("失敗時はnullを返し、カウントとlogin_failureを記録する", async () => {
    const result = await runProtectedCredentialsLogin("applicant", EMAIL, async () => null);
    expect(result).toBeNull();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(createdEvents().map((e) => e.type)).toEqual(["login_failure"]);
  });

  it("閾値到達の失敗でlogin_lockedも記録する", async () => {
    // 原子的SQLがロック成立（lockedUntil設定）を返す
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { lockedUntil: new Date(Date.now() + 60_000) },
    ] as never);
    await runProtectedCredentialsLogin("applicant", EMAIL, async () => null);
    expect(createdEvents().map((e) => e.type)).toEqual(["login_failure", "login_locked"]);
  });

  it("予約で行が返らない（ロック中）場合は認証処理を実行せずnullを返し、login_blockedだけ記録する", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);
    const authorize = vi.fn().mockResolvedValue({ id: "u1" });
    const result = await runProtectedCredentialsLogin("applicant", EMAIL, authorize);
    expect(result).toBeNull();
    expect(authorize).not.toHaveBeenCalled();
    expect(createdEvents().map((e) => e.type)).toEqual(["login_blocked"]);
  });

  it("予約（$queryRaw）は認証処理より先に呼ばれる", async () => {
    const authorize = vi.fn().mockResolvedValue(null);
    await runProtectedCredentialsLogin("applicant", EMAIL, authorize);
    const reserveOrder = vi.mocked(prisma.$queryRaw).mock.invocationCallOrder[0];
    expect(reserveOrder).toBeLessThan(authorize.mock.invocationCallOrder[0]);
  });

  it("10並列の失敗でも照合はちょうど5回まで（login_failure5・login_blocked5・login_locked1）", async () => {
    let count = 0;
    vi.mocked(prisma.$queryRaw).mockImplementation((async () => {
      count += 1;
      if (count < MAX_FAILED_ATTEMPTS) return [{ lockedUntil: null }];
      if (count === MAX_FAILED_ATTEMPTS) return [{ lockedUntil: new Date(Date.now() + 60_000) }];
      return [];
    }) as never);
    const authorize = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return null;
    });
    await Promise.all(
      Array.from({ length: 10 }, () => runProtectedCredentialsLogin("applicant", EMAIL, authorize))
    );
    expect(authorize).toHaveBeenCalledTimes(MAX_FAILED_ATTEMPTS);
    const types = createdEvents().map((e) => e.type);
    expect(types.filter((t) => t === "login_failure")).toHaveLength(5);
    expect(types.filter((t) => t === "login_blocked")).toHaveLength(5);
    expect(types.filter((t) => t === "login_locked")).toHaveLength(1);
  });

  it("予約SQLの日時はUTC変換式で渡し、セッションTZ依存の ::timestamp 単独キャストを使わない", async () => {
    await runProtectedCredentialsLogin("applicant", EMAIL, async () => null);
    // タグ付きテンプレート呼び出し: 第1引数が文字列配列、残りが埋め込み値（Prisma.sql断片を含む）
    const [strings, ...values] = vi.mocked(prisma.$queryRaw).mock.calls[0] as unknown as [
      readonly string[],
      ...unknown[]
    ];
    const flatten = (v: unknown): string[] =>
      v && typeof v === "object" && Array.isArray((v as { strings?: unknown }).strings)
        ? (v as { strings: string[]; values: unknown[] }).strings.concat(
            (v as { values: unknown[] }).values.flatMap(flatten)
          )
        : [];
    const sql = [...strings, ...values.flatMap(flatten)].join("?");
    expect(sql).toContain("AT TIME ZONE 'UTC'");
    expect(sql).not.toMatch(/::timestamp(?!tz)/);
  });

  it("監査ログ・ロック台帳・構造化ログにメールアドレスを平文で残さない", async () => {
    await runProtectedCredentialsLogin("applicant", EMAIL, async () => null);
    const serialized = JSON.stringify([
      createdEvents(),
      vi.mocked(prisma.$queryRaw).mock.calls,
      vi.mocked(process.stdout.write).mock.calls,
    ]).toLowerCase();
    expect(serialized).not.toContain("secret.user");
    expect(serialized).not.toContain("example.com");
    expect(serialized).toContain(hashIdentifier(EMAIL));
  });

  it("監査ログの書き込み失敗でもログイン結果に影響しない", async () => {
    vi.spyOn(process.stderr, "write").mockReturnValue(true);
    vi.mocked(prisma.authEvent.create).mockRejectedValue(new Error("db"));
    const result = await runProtectedCredentialsLogin("applicant", EMAIL, async () => ({
      id: "u1",
    }));
    expect(result).toEqual({ id: "u1" });
  });
});

describe("DB例外とエラーハンドリング", () => {
  it("成功後のカウンタ削除に失敗してもログイン成功を維持する", async () => {
    const errSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    vi.mocked(prisma.loginThrottle.deleteMany).mockRejectedValue(new Error("db secret@example.com"));
    const result = await runProtectedCredentialsLogin("applicant", EMAIL, async () => ({
      id: "u1",
    }));
    expect(result).toEqual({ id: "u1" });
    expect(JSON.stringify(errSpy.mock.calls)).not.toContain("secret@example.com");
  });

  it("台帳テーブル不在などで例外のときは原因ログを出して再送出する（fail openしない）", async () => {
    const errSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const err = Object.assign(new Error("relation LoginThrottle does not exist"), {
      code: "P2021",
      name: "PrismaClientKnownRequestError",
    });
    vi.mocked(prisma.$queryRaw).mockRejectedValue(err);
    const authorize = vi.fn().mockResolvedValue({ id: "u1" });
    await expect(runProtectedCredentialsLogin("applicant", EMAIL, authorize)).rejects.toThrow();
    expect(authorize).not.toHaveBeenCalled();
    const logged = JSON.parse(String(errSpy.mock.calls[0][0]));
    expect(logged).toMatchObject({
      severity: "ERROR",
      message: "login throttle reserve failed",
      errorKind: "PrismaClientKnownRequestError:P2021",
    });
  });
});

describe("hashIdentifier（AUTH_SECRET）", () => {
  it("本番でAUTH_SECRET未設定なら例外（fail closed）", () => {
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => hashIdentifier(EMAIL)).toThrow();
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
