import { afterEach, describe, expect, it, vi } from "vitest";

import { errorFields, logger } from "./logger";

describe("logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("severityとmessageを持つJSON1行をstdoutに出す", () => {
    const out = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    logger.info("hello", { announcementId: "a1" });
    const line = String(out.mock.calls[0][0]);
    expect(line.endsWith("\n")).toBe(true);
    expect(JSON.parse(line)).toEqual({ announcementId: "a1", severity: "INFO", message: "hello" });
  });

  it("ERROR/WARNINGはstderrへ出し、fieldsでseverityを上書きできない", () => {
    const err = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    logger.error("boom", { severity: "INFO", message: "x" });
    logger.warn("careful");
    expect(JSON.parse(String(err.mock.calls[0][0]))).toEqual({ severity: "ERROR", message: "boom" });
    expect(JSON.parse(String(err.mock.calls[1][0])).severity).toBe("WARNING");
  });

  it("errorFieldsはname/messageのみでスタックを含まず、メールアドレスを除去する", () => {
    const fields = errorFields(new Error("send failed to user@example.com"));
    expect(fields).toEqual({ errorName: "Error", errorMessage: "send failed to [redacted-email]" });
    expect(JSON.stringify(fields)).not.toContain("stack");
  });

  it("errorFieldsはメッセージを200文字に切り詰める", () => {
    const fields = errorFields(new Error("a".repeat(500)));
    expect((fields.errorMessage as string).length).toBe(200);
  });

  it("errorFieldsはPrismaエラーのメッセージ（入力値を含みうる）を出さない", () => {
    class PrismaClientKnownRequestError extends Error {
      code = "P2002";
    }
    const e = new PrismaClientKnownRequestError("data: { email: 'a@b.c' }");
    e.name = "PrismaClientKnownRequestError";
    expect(errorFields(e)).toEqual({ errorName: "PrismaClientKnownRequestError", errorCode: "P2002" });
  });

  it("Error以外の値は型名のみ", () => {
    expect(errorFields("secret string")).toEqual({ errorName: "string" });
  });
});
