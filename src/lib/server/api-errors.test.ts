import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("@/lib/server/get-session", () => ({
  getSession: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {},
}));

import { UnauthorizedSessionError } from "@/lib/server/auth-session";
import { DoubleClaimError, InquiryNotFoundError } from "@/lib/server/inquiry-service";
import { toErrorResponse } from "@/lib/server/api-errors";

describe("toErrorResponse", () => {
  it("UnauthorizedSessionErrorを401に変換する", () => {
    const response = toErrorResponse(new UnauthorizedSessionError("no session"));
    expect(response.status).toBe(401);
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

  it("未知のエラーを500に変換する", () => {
    const response = toErrorResponse(new Error("boom"));
    expect(response.status).toBe(500);
  });
});
