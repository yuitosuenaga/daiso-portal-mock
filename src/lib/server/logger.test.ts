import { afterEach, describe, expect, it, vi } from "vitest";

import { z } from "zod";

import { clip, errorFields, logger, MAX_LINE_BYTES, redactSecrets } from "./logger";

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

  describe("write時のfields/message防御（M1）", () => {
    it("fieldsの生の機密値・機密キー・巨大文字列・messageを素通りさせない", () => {
      const err = vi.spyOn(process.stderr, "write").mockReturnValue(true);
      logger.error("failed Bearer abc123tok", {
        id: "x1",
        password: "pw-raw",
        detail: "conn postgres://u:dbpass@h/db",
        big: "z".repeat(20_000),
        nested: { token: "tk-raw", ok: "fine" },
        stack_trace: "at foo",
      });
      const line = String(err.mock.calls[0][0]);
      const parsed = JSON.parse(line);
      for (const s of ["abc123tok", "pw-raw", "dbpass", "tk-raw"]) expect(line).not.toContain(s);
      expect(parsed.id).toBe("x1");
      expect(parsed.nested.ok).toBe("fine");
      expect(parsed.big.length).toBeLessThan(9000);
      expect(parsed.stack_trace).toBe("at foo");
      expect(parsed.severity).toBe("ERROR");
      expect(parsed.message).toBe("failed Bearer [redacted]");
    });

    it("errorFieldsの出力（cause連鎖・errorProps）の構造は変わらない", () => {
      const out = vi.spyOn(process.stdout, "write").mockReturnValue(true);
      const e = new Error("a", { cause: new Error("b", { cause: new Error("c", { cause: new Error("d") }) }) });
      logger.info("m", errorFields(Object.assign(e, { request_id: "r1" })));
      const parsed = JSON.parse(String(out.mock.calls[0][0]));
      expect(parsed.errorProps).toEqual({ request_id: "r1" });
      expect(parsed.cause.cause.cause.errorMessage).toBe("d");
    });
  });

  describe("L3: 引用符内に空白を含む値", () => {
    it("引用符付き値を全体伏字にする", () => {
      const msg = `token: "abc def" and password='p q r' ok secret="x y`;
      const out = errorFields(new Error(msg)).errorMessage as string;
      for (const s of ["abc", "def", "p q", " r'", "x y"]) expect(out).not.toContain(s);
      expect(out).toContain(`token: "[redacted]"`);
      expect(out).toContain(`password='[redacted]'`);
    });
  });

  describe("引用符付き値の取りこぼし（エスケープ・長値・改行）", () => {
    const red = (s: string) => errorFields(new Error(s)).errorMessage as string;
    it("エスケープされた引用符を含む値を全体伏字にする", () => {
      const out = red(`{"token":"a\\"b c"} tail`);
      expect(out).not.toContain("b c");
      expect(out).toContain(`"token":"[redacted]"`);
      expect(out).toContain("} tail");
    });
    it("1024文字を超える引用符内の値も全体伏字にする", () => {
      const out = red(`token="${"a".repeat(1500)} LEAKTAIL more" ok`);
      expect(out).not.toContain("LEAKTAIL");
      expect(out).not.toContain("more");
      expect(out).toContain(`token="[redacted]" ok`);
    });
    it("改行を含む引用符内の値も全体伏字にする", () => {
      const out = red(`token="abc\ndef" ok`);
      expect(out).not.toContain("def");
      expect(out).toContain(`token="[redacted]" ok`);
    });
  });

  describe("エスケープ引用符で囲まれた値・redactSecrets直接呼び出し", () => {
    const red = (s: string) => errorFields(new Error(s)).errorMessage as string;
    it("\\\"abc def\\\"で囲まれた値を全体伏字にする", () => {
      const out = red(`password=\\"abc def\\" tail`);
      expect(out).not.toContain("abc");
      expect(out).not.toContain("def");
      expect(out).toBe(`password=\\"[redacted]\\" tail`);
    });
    it("JSON.stringifyで文字列に埋め込んだ形も伏字にする", () => {
      const out = red(JSON.stringify({ m: `password="abc def" x` }));
      expect(out).not.toContain("abc");
      expect(out).not.toContain("def");
      expect(out).toContain(" x");
    });
    it("二重エスケープ（入れ子）でも漏らさない", () => {
      const out = red(JSON.stringify(JSON.stringify({ m: `password="abc def" x` })));
      expect(out).not.toContain("abc");
      expect(out).not.toContain("def");
    });
    it("エスケープされた単引用符でも全体伏字にする", () => {
      const out = red(`token=\\'p q r\\' ok`);
      expect(out).not.toContain("p q");
      expect(out).toContain("ok");
    });
    it("9216文字超の引用符値をclipを通さず直接渡しても後半が残らない", () => {
      const out = redactSecrets(`token="${"a".repeat(9300)}LEAKTAIL"`);
      expect(out).not.toContain("LEAKTAIL");
      expect(out).not.toContain("aaaa");
      const out2 = redactSecrets(`token=\\"${"a".repeat(9300)}LEAKTAIL\\"`);
      expect(out2).not.toContain("LEAKTAIL");
      expect(out2).not.toContain("aaaa");
    });
  });

  it("深いcauseのmetaがwrite時の再適用で[max-depth]に潰れない", () => {
    const err = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const e3 = Object.assign(new Error("c3"), { meta: { target: ["a"] } });
    const e0 = new Error("c0", { cause: new Error("c1", { cause: new Error("c2", { cause: e3 }) }) });
    logger.error("m", errorFields(e0));
    const line = String(err.mock.calls[0][0]);
    expect(line).not.toContain("max-depth");
    expect(line).toContain(`"target":["a"]`);
  });

  describe("キー側エスケープ・多数バックスラッシュ・病的入力・正常文の保持", () => {
    const BS = "\\";
    it("キー側が\\\"で囲まれたJSON二重文字列化形も値を伏字にする", () => {
      const s = JSON.stringify(JSON.stringify({ password: "abc def" }));
      const out = redactSecrets(s.slice(1, -1));
      expect(out).not.toContain("abc");
      expect(out).not.toContain("def");
      expect(out).toContain("[redacted]");
      expect(redactSecrets(JSON.stringify(JSON.stringify({ password: "abc def", user: "y" })))).toContain("user");
    });
    it("三重エスケープのキーでも漏らさない", () => {
      const out = redactSecrets(JSON.stringify(JSON.stringify(JSON.stringify({ token: "abc def" }))));
      expect(out).not.toContain("abc");
      expect(out).not.toContain("def");
    });
    it("バックスラッシュ8個以上+引用符の値は残りを伏字にする", () => {
      for (const n of [8, 9, 20, 200]) {
        const out = redactSecrets(`password=${BS.repeat(n)}"abc" tail`);
        expect(out).not.toContain("abc");
        expect(out).toContain("[redacted]");
      }
    });
    it("キー側のバックスラッシュが8個以上でも値を伏字にする", () => {
      for (const n of [8, 9, 20, 200, 1000]) {
        const out = redactSecrets(`token${BS.repeat(n)}: abc tail`);
        expect(out).not.toContain("abc");
        expect(out).toContain("[redacted]");
        const out2 = redactSecrets(`${BS.repeat(n)}"password${BS.repeat(n)}":${BS.repeat(n)}"abc def${BS.repeat(n)}" tail`);
        expect(out2).not.toContain("abc");
        expect(out2).not.toContain("def");
      }
    });
    it("シングルクォートのキー・値(\\'password\\')も伏字にする", () => {
      const out = redactSecrets(`{'password': 'abc def', 'user': 'y'}`);
      expect(out).not.toContain("abc");
      expect(out).not.toContain("def");
      expect(out).toContain("'user': 'y'");
      const esc = redactSecrets(`${BS}'password${BS}': ${BS}'abc def${BS}', next`);
      expect(esc).not.toContain("abc");
      expect(esc).not.toContain("def");
    });
    it("既知の限界: 引用符内に同形の\\\"が途中に現れると、そこで値が終わったとみなし残りは伏字にならない（現状固定）", () => {
      const out = redactSecrets(`password=${BS}"abc${BS}"LEAKTAIL${BS}" next`);
      expect(out).not.toContain("abc");
      expect(out).toContain("LEAKTAIL");
    });
    it("既知の過剰伏字: キー直前がバックスラッシュ（Windowsパス等）でも伏字にする（意図的な安全側・現状固定）", () => {
      // `\npassword=...`のようなJSON埋め込み文字列中の改行エスケープ直後のキーを漏らさないため、直前のバックスラッシュでは除外しない。
      expect(redactSecrets("C:\\pwd\\:x secret")).toBe("C:\\pwd\\:[redacted] secret");
      expect(redactSecrets("line1\\npassword=abc")).not.toContain("abc");
    });
    it("キー直後が\\\"のみで:/=を伴わない形は対象外（無加工）", () => {
      const s = `a token${BS}"abc`;
      expect(redactSecrets(s)).toBe(s);
    });
    it("閉じ引用符なしのエスケープ形は残りを伏字にする", () => {
      const out = redactSecrets(`secret=${BS}"abc`);
      expect(out).not.toContain("abc");
    });
    it("引用符内に\\\"を含む通常形を全体伏字にする", () => {
      const out = redactSecrets(`password="ab${BS}"cd" tail`);
      expect(out).not.toContain("ab");
      expect(out).not.toContain("cd");
      expect(out).toContain("tail");
    });
    describe("正常文字列を壊さない", () => {
      it("Windowsパス", () => {
        const s = "C:\\Users\\tokens\\file.txt password is wrong";
        expect(redactSecrets(s)).toBe(s);
      });
      it("文中の語", () => {
        const s = "the password field is required";
        expect(redactSecrets(s)).toBe(s);
      });
      it("URLクエリの後続パラメータ", () => {
        const out = redactSecrets("?token=abc&x=1");
        expect(out).not.toContain("abc");
        expect(out).toContain("&x=1");
      });
      it("JSONの他キー", () => {
        const out = redactSecrets(`{"password":"x","user":"y"}`);
        expect(out).toBe(`{"password":"[redacted]","user":"y"}`);
      });
      it("カンマ区切りの後続", () => {
        expect(redactSecrets("password=abc,next")).toBe("password=[redacted],next");
      });
    });
    describe("病的入力の性能（ReDoS回帰）", () => {
      const units: Array<[string, string]> = [
        ["バックスラッシュ連続", BS],
        ["\\\"の繰り返し", `${BS}"`],
        ["開き引用符の繰り返し", `"`],
        ["password=\"の繰り返し", `password="`],
        ["password=\\\"の繰り返し", `password=${BS}"`],
        ["password=+バックスラッシュ", `password=${BS.repeat(10)}`],
        ["キー側エスケープの繰り返し", `${BS}"password${BS}":${BS}"`],
        ["password=\\\\\\\\\"の繰り返し", `password=${BS.repeat(9)}"`],
        ["token+キー側バックスラッシュ連続", `token${BS.repeat(50)}`],
        ["token+キー側バックスラッシュ1024超", `token${BS.repeat(2000)}`],
        ["キー側バックスラッシュ+引用符+sepの繰り返し", `password${BS.repeat(500)}":`],
      ];
      for (const [label, unit] of units) {
        it(`${label}を長大入力でも十分短時間で処理する`, () => {
          for (const size of [10_000, 200_000]) {
            const input = unit.repeat(Math.ceil(size / unit.length));
            const start = performance.now();
            redactSecrets(input);
            clip(input);
            expect(performance.now() - start).toBeLessThan(1500);
          }
        });
      }
    });
  });

  describe("L4: 機密キー名の追加", () => {
    it("apiKey/csrf/otp/pin系のキーを伏字にし、正常キーは壊さない", () => {
      const meta = { apiKey: "v1", api_key: "v2", csrfToken: "v3", csrf: "v4", otp: "v5", otpCode: "v6", pin: "v7", xsrfToken: "v8", clientSecret: "v9",
        shipping: "ok1", pinned: "ok2", spinner: "ok3", topic: "ok4", optional: "ok5", mapping: "ok6" };
      const json = JSON.stringify(errorFields(Object.assign(new Error("x"), { meta })));
      for (let i = 1; i <= 9; i++) expect(json).not.toContain(`"v${i}"`);
      for (let i = 1; i <= 6; i++) expect(json).toContain(`"ok${i}"`);
    });
  });

  describe("シリアライズ・書き込み失敗", () => {
    const cases: Array<[string, () => Record<string, unknown>]> = [
      ["fields自体のキー列挙がthrow", () => new Proxy({}, { ownKeys() { throw new Error("nope"); } }) as Record<string, unknown>],
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

    it("フォールバックでも生messageを出さず伏字・clipする", () => {
      const err = vi.spyOn(process.stderr, "write").mockReturnValue(true);
      const bad = new Proxy({}, { ownKeys() { throw new Error("nope"); } }) as Record<string, unknown>;
      logger.warn("Bearer leakme123", bad);
      logger.warn(`x${"y".repeat(20000)}`, bad);
      const a = String(err.mock.calls[0][0]);
      expect(a).not.toContain("leakme123");
      expect(JSON.parse(a)).toEqual({ severity: "WARNING", message: "Bearer [redacted]", logError: "serialize failed" });
      expect(JSON.parse(String(err.mock.calls[1][0])).message.length).toBeLessThan(8300);
    });

    it("String(message)がthrowしても固定文言で最小ログを出す", () => {
      const err = vi.spyOn(process.stderr, "write").mockReturnValue(true);
      const evil = { toString() { throw new Error("no"); } } as unknown as string;
      expect(() => logger.warn(evil)).not.toThrow();
      expect(JSON.parse(String(err.mock.calls[0][0]))).toEqual({ severity: "WARNING", message: "[unprintable message]", logError: "serialize failed" });
    });

    it("循環参照・BigInt・toJSONのthrowはsafeValueで安全化され通常ログとして出る", () => {
      const out = vi.spyOn(process.stdout, "write").mockReturnValue(true);
      const o: Record<string, unknown> = {};
      o.self = o;
      logger.info("m", { o, n: BigInt(1), x: { toJSON() { throw new Error("nope"); } } });
      const parsed = JSON.parse(String(out.mock.calls[0][0]));
      expect(parsed.message).toBe("m");
      expect(parsed.o).toEqual({ self: "[circular]" });
      expect(parsed.n).toBe("1");
      expect(parsed.logError).toBeUndefined();
    });

    it("書き込み自体が失敗しても例外を出さず、固定1行をstderrへ出す", () => {
      vi.spyOn(process.stdout, "write").mockImplementation(() => { throw new Error("EPIPE"); });
      const err = vi.spyOn(process.stderr, "write").mockReturnValue(true);
      expect(() => logger.info("secret-message-xyz")).not.toThrow();
      expect(err).toHaveBeenCalledTimes(1);
      const line = String(err.mock.calls[0][0]);
      expect(JSON.parse(line)).toEqual({ severity: "ERROR", message: "logger write failed" });
      expect(line).not.toContain("secret-message-xyz");
    });

    it("stderrも失敗しても例外を出さない", () => {
      vi.spyOn(process.stdout, "write").mockImplementation(() => { throw new Error("EPIPE"); });
      vi.spyOn(process.stderr, "write").mockImplementation(() => { throw new Error("EPIPE"); });
      expect(() => logger.info("x")).not.toThrow();
    });
  });

  describe("ReDoS耐性と堅牢性", () => {
    const sizes = [100_000, 200_000];
    const patterns: Array<[string, string]> = [
      ["a-", "a-"],
      ["a.", "a."],
      ["password-", "password-"],
      ["Bearer ", "Bearer "],
      ["a:/", "a:/"],
      ["://", "://"],
      ["token=", "token="],
      ["key-name-like", "my-api-key-name_"],
      ["Authorization ", "Authorization "],
      ["cookie:", "cookie:"],
    ];
    for (const [label, unit] of patterns) {
      it(`${label} の繰り返し(100KB/200KB)を1秒以内に処理する`, () => {
        for (const size of sizes) {
          const input = unit.repeat(Math.ceil(size / unit.length));
          const start = performance.now();
          const f = errorFields(Object.assign(new Error(input), { cause: new Error(input), extra: input, meta: { v: input } }));
          expect(performance.now() - start).toBeLessThan(1000);
          expect(String(f.errorMessage).length).toBeLessThanOrEqual(8192 + "...[truncated]".length);
        }
      });
    }

    it("stack_trace・cause・meta・errorProps・errorValueの全文字列経路が上限で切られる", () => {
      const big = "a-".repeat(100_000);
      const e = Object.assign(new Error("x"), { extra: big, meta: { v: big }, cause: new Error(big) });
      e.stack = big;
      const f = errorFields(e);
      const max = 8192 + "...[truncated]".length;
      expect(String(f.stack_trace).length).toBeLessThanOrEqual(max);
      expect(String((f.errorProps as Record<string, unknown>).extra).length).toBeLessThanOrEqual(max);
      expect(String((f.meta as Record<string, unknown>).v).length).toBeLessThanOrEqual(max);
      expect(String(cause(f).errorMessage).length).toBeLessThanOrEqual(max);
      expect(String(errorFields(big).errorValue).length).toBeLessThanOrEqual(max);
    });

    it("切り詰め境界をまたぐ秘密値の断片を残さない", () => {
      const f = errorFields(new Error(`${"a ".repeat(4090)}password=${"S".repeat(300)}`));
      expect(String(f.errorMessage)).not.toContain("SSSS");
    });

    it("errorFieldsはgetter/Proxyが例外を投げても例外を伝播しない", () => {
      const e = new Error("x");
      Object.defineProperty(e, "message", { get() { throw new Error("boom"); } });
      expect(errorFields(e)).toEqual({ errorName: "unknown", logError: "errorFields failed" });
      const proxy = new Proxy({}, { ownKeys() { throw new Error("boom"); } });
      expect(errorFields(proxy)).toEqual({ errorName: "unknown", logError: "errorFields failed" });
    });

    it("Date/Map/Setを意味のある値にする（上限付き）", () => {
      const f = errorFields({
        d: new Date("2026-01-02T03:04:05.000Z"),
        bad: new Date("x"),
        s: new Set([1, 2]),
        m: new Map([["k", "v"]]),
        bigSet: new Set(Array.from({ length: 100 }, (_, i) => i)),
      });
      const v = f.errorValue as Record<string, unknown>;
      expect(v.d).toBe("2026-01-02T03:04:05.000Z");
      expect(v.bad).toBe("Invalid Date");
      expect(v.s).toEqual([1, 2]);
      expect(v.m).toEqual([["k", "v"]]);
      expect((v.bigSet as unknown[]).length).toBe(20);
    });

    it("stack:falseならstack_traceを出さない（causeも）", () => {
      const f = errorFields(Object.assign(new Error("a"), { cause: new Error("b") }), { stack: false });
      expect(f.stack_trace).toBeUndefined();
      expect(f.errorMessage).toBe("a");
      expect(cause(f).stack_trace).toBeUndefined();
    });

    it("ZodErrorはerrorMessageを要約し、stack_traceとissuesの重複を出さない", () => {
      const err = z.object({ a: z.string(), b: z.number() }).safeParse({}).error!;
      const f = errorFields(err);
      expect(f.errorMessage).toBe("2 validation issue(s)");
      expect(f.stack_trace).toBeUndefined();
      expect(JSON.stringify(f)).not.toContain("invalid_type");
    });

    it("マルチバイトの巨大message/causeでも1行が上限バイトを超えない", () => {
      const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      const jp = "日本語😀".repeat(50_000);
      logger.error("jp", errorFields(Object.assign(new Error(jp), { cause: new Error(jp, { cause: new Error(jp) }) })));
      const line = String(spy.mock.calls[0][0]);
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(MAX_LINE_BYTES + 1);
      expect(() => JSON.parse(line)).not.toThrow();
      spy.mockRestore();
    });
  });
});
