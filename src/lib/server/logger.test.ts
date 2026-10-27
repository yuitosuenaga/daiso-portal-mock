import { afterEach, describe, expect, it, vi } from "vitest";

import { errorFields, logger, MAX_LINE_BYTES } from "./logger";

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

  const cause = (f: Record<string, unknown>) => f.cause as Record<string, unknown>;
  describe("errorFields", () => {
    it("name/message/stack_traceを生のまま出す（メールも除去しない）", () => {
      const f = errorFields(new Error("send failed to user@example.com"));
      expect(f.errorName).toBe("Error");
      expect(f.errorMessage).toBe("send failed to user@example.com");
      expect(String(f.stack_trace)).toContain("Error: send failed");
    });

    it("200文字を超えるメッセージも出し、8KBで切り詰める", () => {
      expect((errorFields(new Error("a".repeat(500))).errorMessage as string).length).toBe(500);
      const long = errorFields(new Error("a".repeat(20000))).errorMessage as string;
      expect(long.length).toBe(8192 + "...[truncated]".length);
      expect(long.endsWith("...[truncated]")).toBe(true);
    });

    it("Prismaエラーはcodeとmetaを出す", () => {
      class PrismaClientKnownRequestError extends Error {
        code = "P2002";
        meta = { target: ["email"], value: "a@b.c" };
      }
      const e = new PrismaClientKnownRequestError("Unique constraint failed");
      e.name = "PrismaClientKnownRequestError";
      const f = errorFields(e);
      expect(f.errorCode).toBe("P2002");
      expect(f.meta).toEqual({ target: ["email"], value: "a@b.c" });
      expect(f.errorMessage).toBe("Unique constraint failed");
    });

    it("status/statusCodeと追加プロパティ(request_id等)を出す", () => {
      const e = Object.assign(new Error("rate limited"), { status: 429, request_id: "req_123", headers: { a: "b" } });
      const f = errorFields(e);
      expect(f.status).toBe(429);
      expect(f.errorProps).toEqual({ request_id: "req_123", headers: { a: "b" } });
    });

    it("causeを辿り、深さ3で打ち切る", () => {
      const e0 = new Error("e0");
      const e1 = new Error("e1", { cause: e0 });
      const e2 = new Error("e2", { cause: e1 });
      const e3 = new Error("e3", { cause: e2 });
      const e4 = new Error("e4", { cause: e3 });
      const c1 = cause(errorFields(e4));
      expect(c1.errorMessage).toBe("e3");
      const c3 = cause(cause(c1));
      expect(c3.errorMessage).toBe("e1");
      expect(c3.cause).toBe("[max-cause-depth]");
    });

    it("循環causeで無限ループしない", () => {
      const a = new Error("a");
      const b = new Error("b", { cause: a });
      (a as { cause?: unknown }).cause = b;
      const f = errorFields(a);
      expect(cause(f).errorMessage).toBe("b");
      expect(cause(f).cause).toBe("[circular]");
      expect(() => JSON.stringify(f)).not.toThrow();
    });

    it("非Error値は型名とJSON化できる範囲の値を出す", () => {
      expect(errorFields("some string")).toEqual({ errorName: "string", errorValue: "some string" });
      expect(errorFields({ a: 1 })).toEqual({ errorName: "object", errorValue: { a: 1 } });
      const o: Record<string, unknown> = {};
      o.self = o;
      expect(() => JSON.stringify(errorFields(o))).not.toThrow();
    });

    it("資格情報はmessage/stack/cause/metaで伏字にする", () => {
      const msg =
        "fail Bearer abc.DEF-123 key sk-ant-api03-XYZ password=hunter2 Authorization: Basic zzz url postgresql://app:s3cret@db:5432/x";
      const e = Object.assign(new Error(msg, { cause: new Error(msg) }), { meta: { url: msg } });
      const json = JSON.stringify(errorFields(e));
      for (const secret of ["abc.DEF-123", "sk-ant-api03-XYZ", "hunter2", "Basic zzz", "s3cret"]) {
        expect(json).not.toContain(secret);
      }
      expect(json).toContain("postgresql://app:[redacted]@db:5432/x");
      expect(json).toContain("Bearer [redacted]");
    });
  });

  describe("伏字の拡張", () => {
    it("素通りしていた形式を伏字にする", () => {
      const msg =
        "a token=abc123secret b api_key: AKIA123 c client_secret=abc d mongodb://u:pw@h/db e redis://x:y@h:6379 f amqp://g:hh@h g x-api-key: KEY999 h Cookie: sid=zzz";
      const json = JSON.stringify(errorFields(new Error(msg)));
      for (const s of ["abc123secret", "AKIA123", "client_secret=abc", ":pw@", "x:y@", "g:hh@", "KEY999", "sid=zzz"]) {
        expect(json).not.toContain(s);
      }
      expect(json).toContain("mongodb://u:[redacted]@h/db");
    });

    it("キー名ベースでmeta/errorProps/errorValueの値を伏字にする（大文字小文字・区切り違い許容）", () => {
      const secrets = { Password: "p1", API_KEY: "p2", "x-api-key": "p3", clientSecret: "p4", Authorization: "p5", "set-cookie": "p6", access_token: "p7", nested: { passwd: "p8" } };
      const e = Object.assign(new Error("x"), { meta: secrets, token: "p9", request_id: "r1" });
      const json = JSON.stringify(errorFields(e));
      for (let i = 1; i <= 9; i++) expect(json).not.toContain(`"p${i}"`);
      expect(json).toContain("r1");
      expect(JSON.stringify(errorFields({ secret: "p10", ok: "fine" }))).not.toContain("p10");
      expect(JSON.stringify(errorFields({ secret: "p10", ok: "fine" }))).toContain("fine");
    });

    it("普通のメッセージ・キーは壊さない", () => {
      const msg = "Unexpected token < in JSON at position 0; max_tokens exceeded; see https://example.com:8080/path@x; user=alice";
      expect(errorFields(new Error(msg)).errorMessage).toBe(msg);
      const f = errorFields(Object.assign(new Error("x"), { meta: { max_tokens: 5, inputTokens: 3, target: ["email"] } }));
      expect(f.meta).toEqual({ max_tokens: 5, inputTokens: 3, target: ["email"] });
    });
  });

  describe("カスタムプロパティ（#169のIDを持つ例外）", () => {
    it("inquiryId等の独自プロパティがerrorPropsに出る", () => {
      class InquiryNotFoundError extends Error {
        constructor(readonly inquiryId: string, readonly email: string) {
          super("Inquiry not found");
          this.name = "InquiryNotFoundError";
        }
      }
      const f = errorFields(new InquiryNotFoundError("inq-1", "a@b.c"));
      expect(f.errorProps).toEqual({ inquiryId: "inq-1", email: "a@b.c" });
    });
  });

  describe("1行サイズ上限", () => {
    it("巨大なcause/metaでも1行が上限内に収まり、最低限の情報を残す", () => {
      const err = vi.spyOn(process.stderr, "write").mockReturnValue(true);
      const big = "x".repeat(8000);
      const meta = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, Array.from({ length: 20 }, () => big)]));
      const e = Object.assign(new Error("boom " + big, { cause: Object.assign(new Error(big), { meta }) }), { meta, code: "P2002" });
      logger.error("fail", { ...errorFields(e), extra: meta });
      const line = String(err.mock.calls[0][0]);
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(MAX_LINE_BYTES);
      const parsed = JSON.parse(line);
      expect(parsed).toMatchObject({ severity: "ERROR", message: "fail", logError: "line too large", errorName: "Error", errorCode: "P2002" });
      expect(parsed.originalBytes).toBeGreaterThan(MAX_LINE_BYTES);
      expect(parsed.errorMessage.startsWith("boom ")).toBe(true);
      expect(parsed.errorMessage.length).toBeLessThanOrEqual(4096);
    });

    it("上限内なら通常どおり出す", () => {
      const out = vi.spyOn(process.stdout, "write").mockReturnValue(true);
      logger.info("ok", { a: 1 });
      expect(JSON.parse(String(out.mock.calls[0][0]))).toEqual({ a: 1, severity: "INFO", message: "ok" });
    });
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
