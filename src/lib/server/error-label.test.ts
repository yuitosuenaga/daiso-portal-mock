import { describe, expect, it } from "vitest";

import { safeErrorLabel } from "@/lib/server/error-label";

describe("safeErrorLabel", () => {
  it("名前とPrismaコードのみを返し、メッセージを含めない", () => {
    const error = Object.assign(new Error("user@example.com unreachable"), {
      name: "PrismaClientInitializationError",
      code: "P1001",
    });
    expect(safeErrorLabel(error)).toBe("PrismaClientInitializationError P1001");
  });

  it("Prisma形式以外のcodeは無視する", () => {
    const error = Object.assign(new Error("x"), { code: "user@example.com" });
    expect(safeErrorLabel(error)).toBe("Error");
  });

  it("Error以外はUnknownError", () => {
    expect(safeErrorLabel("boom")).toBe("UnknownError");
  });
});
