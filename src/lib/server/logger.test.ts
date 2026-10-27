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

  describe("シリアライズ・書き込み失敗", () => {
    const cases: Array<[string, () => Record<string, unknown>]> = [
      ["循環参照", () => { const o: Record<string, unknown> = {}; o.self = o; return { o }; }],
      ["BigInt", () => ({ n: BigInt(1) })],
      ["toJSONがthrow", () => ({ x: { toJSON() { throw new Error("nope"); } } })],
    ];
    it.each(cases)("%s でも例外を出さず最小ログを出す", (_name, make) => {
      const out = vi.spyOn(process.stdout, "write").mockReturnValue(true);
      const err = vi.spyOn(process.stderr, "write").mockReturnValue(true);
      expect(() => logger.info("m1", make())).not.toThrow();
      expect(() => logger.warn("m2", make())).not.toThrow();
      expect(JSON.parse(String(out.mock.calls[0][0]))).toEqual({ severity: "INFO", message: "m1", logError: "serialize failed" });
      expect(JSON.parse(String(err.mock.calls[0][0]))).toEqual({ severity: "WARNING", message: "m2", logError: "serialize failed" });
      // 振り分け維持: WARNINGはstdoutに出ず、INFOはstderrに出ない
      expect(out).toHaveBeenCalledTimes(1);
      expect(err).toHaveBeenCalledTimes(1);
    });

    it("書き込み自体が失敗しても例外を出さない", () => {
      vi.spyOn(process.stdout, "write").mockImplementation(() => { throw new Error("EPIPE"); });
      expect(() => logger.info("x")).not.toThrow();
    });
  });
});
