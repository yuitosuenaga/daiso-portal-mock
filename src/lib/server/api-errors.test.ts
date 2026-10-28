import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("@/lib/server/get-session", () => ({
  getSession: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

import { ForbiddenSessionError, UnauthorizedSessionError } from "@/lib/server/auth-session";
import {
  ClaimOwnershipError,
  DoubleClaimError,
  InquiryNotFoundError,
} from "@/lib/server/inquiry-service";
import { CompanyNotFoundError } from "@/lib/server/company-service";
import { toErrorResponse } from "@/lib/server/api-errors";
import { logger } from "@/lib/server/logger";

describe("toErrorResponse", () => {
  it("UnauthorizedSessionErrorを401に変換する", () => {
    const response = toErrorResponse(new UnauthorizedSessionError("no session"));
    expect(response.status).toBe(401);
  });

  it("ForbiddenSessionErrorを403に変換する", () => {
    const response = toErrorResponse(new ForbiddenSessionError("admin required"));
    expect(response.status).toBe(403);
  });

  it("エラーメッセージ・ID・Zodのissuesをレスポンス本文に含めず固定文言を返す", async () => {
    const zodError = z.object({ secretField: z.string() }).safeParse({}).error!;
    const cases: Array<[unknown, number, string]> = [
      [new UnauthorizedSessionError("no session for user-123"), 401, "Unauthorized"],
      [zodError, 400, "Invalid request"],
      [new InquiryNotFoundError("inquiry-secret-id"), 404, "Not Found"],
      [new DoubleClaimError("inquiry-secret-id"), 409, "Conflict"],
      [new ClaimOwnershipError("inquiry-secret-id"), 403, "Forbidden"],
      [new Error("db password leaked"), 500, "Internal Server Error"],
    ];
    for (const [error, status, message] of cases) {
      const response = toErrorResponse(error);
      expect(response.status).toBe(status);
      const text = JSON.stringify(await response.json());
      expect(text).toBe(JSON.stringify({ error: message }));
      expect(text).not.toMatch(/secret|user-123|leaked/);
    }
  });

  it("ZodErrorを400に変換する", () => {
    const result = z.string().safeParse(123);
    const response = toErrorResponse(result.success ? undefined : result.error);
    expect(response.status).toBe(400);
  });

  it("InquiryNotFoundErrorを404に変換する", () => {
    const response = toErrorResponse(new InquiryNotFoundError("missing"));
    expect(response.status).toBe(404);
  });

  it("CompanyNotFoundErrorを404に変換する", async () => {
    const response = toErrorResponse(new CompanyNotFoundError("missing-company"));
    expect(response.status).toBe(404);
    expect(JSON.stringify(await response.json())).not.toContain("missing-company");
  });

  it("DoubleClaimErrorを409に変換する", () => {
    const response = toErrorResponse(new DoubleClaimError("inquiry-1"));
    expect(response.status).toBe(409);
  });

  it("ClaimOwnershipErrorを403に変換する", () => {
    const response = toErrorResponse(new ClaimOwnershipError("inquiry-1"));
    expect(response.status).toBe(403);
  });

  it("未知のエラーを500に変換する", () => {
    const response = toErrorResponse(new Error("boom"));
    expect(response.status).toBe(500);
  });

  it("応答から外した詳細をサーバーログに出す（Zodはissuesのみ、ID等は例外プロパティ）", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});

    const zodError = z.object({ secretField: z.string() }).safeParse({ secretField: 1, body: "x" }).error!;
    toErrorResponse(zodError);
    const [, zodFields] = warn.mock.calls[0] as [string, Record<string, unknown>];
    expect(zodFields.issues).toEqual([
      expect.objectContaining({ path: "secretField", code: "invalid_type", message: expect.any(String) }),
    ]);

    toErrorResponse(new InquiryNotFoundError("inq-9"));
    const [, nfFields] = warn.mock.calls[1] as [string, Record<string, unknown>];
    expect(nfFields.errorProps).toEqual({ inquiryId: "inq-9" });

    toErrorResponse(new Error("db password=hunter2 down"));
    const [, ufields] = error.mock.calls[0] as [string, Record<string, unknown>];
    expect(ufields.errorMessage).toContain("down");
    expect(JSON.stringify(ufields)).not.toContain("hunter2");
    vi.restoreAllMocks();
  });

  it("想定内エラー(4xx)はstack_traceを出さず、500は出す", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    const zodError = z.object({ a: z.string() }).safeParse({}).error!;
    for (const e of [
      new UnauthorizedSessionError("x"),
      zodError,
      new InquiryNotFoundError("i"),
      new DoubleClaimError("i"),
      new ClaimOwnershipError("i"),
    ]) {
      toErrorResponse(e);
    }
    for (const call of warn.mock.calls) {
      expect((call[1] as Record<string, unknown>).stack_trace).toBeUndefined();
      expect((call[1] as Record<string, unknown>).errorName).toBeDefined();
    }
    expect(warn).toHaveBeenCalledTimes(5);
    toErrorResponse(new Error("boom"));
    expect((error.mock.calls[0][1] as Record<string, unknown>).stack_trace).toContain("boom");
    warn.mockRestore();
    error.mockRestore();
  });

  it("Zodのissue messageに含まれる受信値の機密・長大文字列を伏字/clipしてログに出す", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const long = "x".repeat(20_000);
    const result = z.object({ a: z.string().refine(() => false, { message: `bad value Bearer sekret-token-1 ${long}` }) }).safeParse({ a: "v" });
    toErrorResponse(result.success ? undefined : result.error);
    const fields = warn.mock.calls[warn.mock.calls.length - 1][1] as { issues: Array<{ message: string }> };
    const text = JSON.stringify(fields.issues);
    expect(text).not.toContain("sekret-token-1");
    expect(fields.issues[0].message.length).toBeLessThan(9000);
    warn.mockRestore();
  });
});
