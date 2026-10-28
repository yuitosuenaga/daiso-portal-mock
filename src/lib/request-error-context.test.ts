import { describe, expect, it } from "vitest";

import {
  buildEdgeRequestErrorLine,
  buildRequestContextFields,
  isNextControlFlowDigest,
  sanitizeRequestPath,
} from "./request-error-context";

const request = {
  path: "/ja/inquiries?email=a@example.com&token=abc#frag",
  method: "POST",
  headers: { cookie: "session=SECRETCOOKIE", authorization: "Bearer SECRETTOKEN" },
};
const context = {
  routerKind: "App Router",
  routePath: "/[locale]/inquiries",
  routeType: "render",
  renderSource: "server-rendering",
  revalidateReason: undefined,
} as const;

describe("sanitizeRequestPath", () => {
  it("クエリとハッシュを除去する", () => {
    expect(sanitizeRequestPath("/ja/a?x=1#h")).toBe("/ja/a");
    expect(sanitizeRequestPath("/ja/a#h?x")).toBe("/ja/a");
  });
  it("絶対URLはpathnameのみ", () => {
    expect(sanitizeRequestPath("https://example.com/ja/a?x=1")).toBe("/ja/a");
  });
  it("先頭の連続スラッシュを1つに正規化する", () => {
    expect(sanitizeRequestPath("//evil.com/a?x")).toBe("/evil.com/a");
    expect(sanitizeRequestPath("///a")).toBe("/a");
  });
  it("非文字列はundefined", () => {
    expect(sanitizeRequestPath(undefined)).toBeUndefined();
    expect(sanitizeRequestPath(123)).toBeUndefined();
  });
  it("2048文字で切り詰める", () => {
    expect(sanitizeRequestPath("/" + "a".repeat(3000))).toHaveLength(2048);
  });
});

describe("isNextControlFlowDigest", () => {
  it("制御フローはtrue", () => {
    expect(isNextControlFlowDigest("NEXT_REDIRECT;replace;/ja/login;307;")).toBe(true);
    expect(isNextControlFlowDigest("NEXT_HTTP_ERROR_FALLBACK;404")).toBe(true);
    expect(isNextControlFlowDigest("DYNAMIC_SERVER_USAGE")).toBe(true);
  });
  it.each([
    "NEXT_REDIRECT;replace;/a;307;",
    "NEXT_HTTP_ERROR_FALLBACK;404",
    "NEXT_NOT_FOUND",
    "DYNAMIC_SERVER_USAGE",
    "BAILOUT_TO_CLIENT_SIDE_RENDERING",
  ])("各プレフィックスをtrueと判定する: %s", (digest) => {
    expect(isNextControlFlowDigest(digest)).toBe(true);
  });
  it("それ以外はfalse", () => {
    expect(isNextControlFlowDigest("123456789")).toBe(false);
    expect(isNextControlFlowDigest(undefined)).toBe(false);
    expect(isNextControlFlowDigest(404)).toBe(false);
  });
});

describe("buildRequestContextFields", () => {
  it("cookie/authorizationを出力しない", () => {
    const json = JSON.stringify(buildRequestContextFields(Object.assign(new Error("x"), { digest: "d1" }), request, context));
    expect(json).not.toMatch(/cookie|authorization|Bearer|SECRET|a@example\.com|token/i);
    expect(JSON.parse(json)).toMatchObject({ digest: "d1", requestPath: "/ja/inquiries", requestMethod: "POST", routeType: "render" });
  });
  it("digest無しならdigestキー無し", () => {
    expect("digest" in buildRequestContextFields(new Error("x"), request, context)).toBe(false);
    expect("httpRequest" in buildRequestContextFields(new Error("x"), request, context)).toBe(false);
  });
});

describe("buildEdgeRequestErrorLine", () => {
  it("JSON1行でmessage/stackを出さない", () => {
    const line = buildEdgeRequestErrorLine(Object.assign(new Error("secret detail"), { digest: "d2" }), request, context);
    expect(line).not.toContain("\n");
    const o = JSON.parse(line);
    expect(o).toMatchObject({ severity: "ERROR", message: "[request-error] Unhandled request error", runtime: "edge", errorName: "Error", digest: "d2" });
    expect(o.errorMessage).toBeUndefined();
    expect(o.stack_trace).toBeUndefined();
    expect(line).not.toContain("secret detail");
  });
  it("非Errorでも例外にならない", () => {
    expect(() => buildEdgeRequestErrorLine("str", request, context)).not.toThrow();
    expect(() => buildEdgeRequestErrorLine(undefined, request, context)).not.toThrow();
    expect(JSON.parse(buildEdgeRequestErrorLine(null, request, context)).errorName).toBe("object");
  });
});
