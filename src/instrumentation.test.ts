import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const reportRequestError = vi.fn();
vi.mock("@/lib/server/request-error-log", () => ({ reportRequestError: (...a: unknown[]) => reportRequestError(...a) }));

import { onRequestError } from "./instrumentation";

const request = { path: "/ja/x?q=1", method: "GET", headers: { cookie: "SECRET" } };
const context = { routerKind: "App Router", routePath: "/[locale]/x", routeType: "render", revalidateReason: undefined } as const;

describe("onRequestError", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    reportRequestError.mockReset();
  });

  it("nodejsではreportRequestErrorを呼ぶ", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const err = new Error("x");
    await onRequestError(err, request, context);
    expect(reportRequestError).toHaveBeenCalledWith(err, request, context);
  });

  it("edgeではconsole.errorにJSON1行を出す", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await onRequestError(new Error("x"), request, context);
    expect(reportRequestError).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledTimes(1);
    const o = JSON.parse(String(spy.mock.calls[0][0]));
    expect(o).toMatchObject({ severity: "ERROR", runtime: "edge", requestPath: "/ja/x" });
  });

  it("edgeでも制御フローdigestは出さない", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await onRequestError(Object.assign(new Error("r"), { digest: "NEXT_REDIRECT;replace;/a;307;" }), request, context);
    expect(spy).not.toHaveBeenCalled();
  });

  it("未設定は何もしない", async () => {
    vi.stubEnv("NEXT_RUNTIME", "");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await onRequestError(new Error("x"), request, context);
    expect(reportRequestError).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });

  it("reporterがthrowしてもrejectしない", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    reportRequestError.mockImplementation(() => {
      throw new Error("boom");
    });
    await expect(onRequestError(new Error("x"), request, context)).resolves.toBeUndefined();
  });
});

/**
 * request-error-context.ts はEdge/Node共用。server-only や logger をimportすると
 * Edgeランタイムでビルド/実行が壊れるため、importが空であることを静的に固定する。
 */
describe("request-error-context.ts はEdge互換(importなし)", () => {
  it("import/require/dynamic importを含まない", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/request-error-context.ts"), "utf8");
    const re =
      /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\sfrom\s+)?["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)|\brequire\(\s*["']([^"']+)["']\s*\)/g;
    const specs = [...source.matchAll(re)].map((m) => m[1] ?? m[2] ?? m[3]);
    expect(specs).toEqual([]);
  });
});
