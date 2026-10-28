import { afterEach, describe, expect, it, vi } from "vitest";

import { reportRequestError } from "./request-error-log";

const request = {
  path: "/ja/inquiries?email=leak@example.com",
  method: "GET",
  headers: { cookie: "session=SECRETCOOKIE", authorization: "Bearer SECRETTOKEN" },
};
const context = { routerKind: "App Router", routePath: "/[locale]/inquiries", routeType: "render", renderSource: "server-rendering", revalidateReason: undefined } as const;

function capture() {
  return vi.spyOn(process.stderr, "write").mockReturnValue(true);
}
const lineOf = (spy: ReturnType<typeof capture>, i = 0) => String(spy.mock.calls[i][0]);

describe("reportRequestError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("ErrorをJSON1行で出す", () => {
    const err = capture();
    reportRequestError(Object.assign(new Error("boom"), { digest: "dg1" }), request, context);
    expect(err).toHaveBeenCalledTimes(1);
    const line = lineOf(err);
    expect(line.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(line)).toMatchObject({
      severity: "ERROR",
      message: "[request-error] Unhandled request error",
      errorName: "Error",
      errorMessage: "boom",
      digest: "dg1",
      requestPath: "/ja/inquiries",
      routeType: "render",
      runtime: "nodejs",
    });
    expect(JSON.parse(line).stack_trace).toEqual(expect.any(String));
  });

  it("長いメッセージを切り詰める", () => {
    const err = capture();
    reportRequestError(new Error("a".repeat(20000)), request, context);
    expect(JSON.parse(lineOf(err)).errorMessage.length).toBeLessThan(9000);
  });

  it("接続文字列のパスワードを伏字にする", () => {
    const err = capture();
    reportRequestError(new Error("fail postgres://u:pass@h/db"), request, context);
    expect(lineOf(err)).not.toContain("pass@");
  });

  it("非Errorでも記録する", () => {
    const err = capture();
    reportRequestError("oops", request, context);
    reportRequestError({ a: 1 }, request, context);
    reportRequestError(undefined, request, context);
    expect(err).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 3; i++) expect(JSON.parse(lineOf(err, i)).severity).toBe("ERROR");
  });

  it("digest無しErrorも記録する", () => {
    const err = capture();
    reportRequestError(new Error("x"), request, context);
    expect(err).toHaveBeenCalledTimes(1);
    expect("digest" in JSON.parse(lineOf(err))).toBe(false);
  });

  it("制御フローdigestは出力しない", () => {
    const err = capture();
    reportRequestError(Object.assign(new Error("r"), { digest: "NEXT_REDIRECT;replace;/ja/login;307;" }), request, context);
    expect(err).not.toHaveBeenCalled();
  });

  it("headers/Cookie/Authorization/クエリを出力しない", () => {
    const err = capture();
    reportRequestError(new Error("x"), request, context);
    expect(lineOf(err)).not.toMatch(/SECRET|cookie|authorization|leak@example\.com|headers/i);
  });

  it("異常なerrorでもthrowしない", () => {
    capture();
    const evil = new Proxy(new Error("x"), {
      get() {
        throw new Error("getter");
      },
      has() {
        throw new Error("has");
      },
      getPrototypeOf() {
        throw new Error("proto");
      },
    });
    expect(() => reportRequestError(evil, request, context)).not.toThrow();
    expect(() => reportRequestError(new Error("x"), null as never, null as never)).not.toThrow();
  });
});
