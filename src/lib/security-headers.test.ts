import { describe, expect, it } from "vitest";

import {
  FILE_ROUTE_SOURCES,
  buildContentSecurityPolicy,
  buildFileRouteSecurityHeaders,
  buildHeadersConfig,
  buildSecurityHeaders,
} from "@/lib/security-headers.mjs";

const byKey = (headers: { key: string; value: string }[]) =>
  Object.fromEntries(headers.map((h) => [h.key, h.value]));

describe("buildSecurityHeaders", () => {
  it("本番では必要なヘッダをすべて含む", () => {
    const h = byKey(buildSecurityHeaders({ isDev: false }));
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Strict-Transport-Security"]).toContain("max-age=");
    expect(h["Permissions-Policy"]).toContain("camera=()");
    expect(h["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  });

  it("開発ではHSTSを付けない", () => {
    const h = byKey(buildSecurityHeaders({ isDev: true }));
    expect(h["Strict-Transport-Security"]).toBeUndefined();
  });
});

describe("buildContentSecurityPolicy", () => {
  it("本番ではunsafe-evalを許可せず、upgrade-insecure-requestsを付ける", () => {
    const csp = buildContentSecurityPolicy({ isDev: false });
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).toContain("object-src 'none'");
  });

  it("開発ではHMR用にunsafe-evalとwsを許可する", () => {
    const csp = buildContentSecurityPolicy({ isDev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("Googleログインとドキュメント埋め込みに必要な送信先を許可する", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("https://accounts.google.com");
    expect(csp).toContain("https://docs.google.com");
  });
});

describe("buildFileRouteSecurityHeaders", () => {
  it("同一オリジンiframeを許可し、他のヘッダーは全体用と同じ", () => {
    const h = byKey(buildFileRouteSecurityHeaders({ isDev: false }));
    expect(h["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(h["Content-Security-Policy"]).toContain("frame-ancestors 'self'");
    expect(h["Content-Security-Policy"]).not.toContain("frame-ancestors 'none'");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Strict-Transport-Security"]).toContain("max-age=");
  });
});

describe("buildHeadersConfig", () => {
  it("全体用の後にファイルルート用が並ぶ（後勝ちで上書きする順序）", () => {
    const config = buildHeadersConfig({ isDev: false });
    expect(config[0].source).toBe("/:path*");
    expect(byKey(config[0].headers)["X-Frame-Options"]).toBe("DENY");
    const rest = config.slice(1);
    expect(rest.map((entry: { source: string }) => entry.source)).toEqual([...FILE_ROUTE_SOURCES]);
    for (const entry of rest) {
      expect(byKey(entry.headers)["X-Frame-Options"]).toBe("SAMEORIGIN");
    }
  });

  it("PR1ではドキュメントのファイル配信ルートのみ", () => {
    expect(FILE_ROUTE_SOURCES).toEqual(["/api/documents/:id/file"]);
  });
});
