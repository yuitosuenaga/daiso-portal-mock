import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("@/lib/server/get-session", () => ({
  getSession: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import {
  ClaimOwnershipError,
  DoubleClaimError,
  InquiryNotFoundError,
} from "@/lib/server/inquiry-service";
import { toErrorResponse } from "@/lib/server/api-errors";

describe("toErrorResponse", () => {
  it("UnauthorizedSessionErrorを401に変換する", () => {
    const response = toErrorResponse(new UnauthorizedSessionError("no session"));
    expect(response.status).toBe(401);
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
});
