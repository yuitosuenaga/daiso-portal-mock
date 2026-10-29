import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";

function req(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/cron/x", { headers });
}

afterEach(() => vi.unstubAllEnvs());

describe("isAuthorizedCronRequest", () => {
  it("CRON_SECRET未設定なら常にfalse", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isAuthorizedCronRequest(req({ "x-cron-secret": "" }))).toBe(false);
    expect(isAuthorizedCronRequest(req({ authorization: "Bearer anything" }))).toBe(false);
  });

  it("ヘッダ無し・不一致はfalse", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isAuthorizedCronRequest(req())).toBe(false);
    expect(isAuthorizedCronRequest(req({ "x-cron-secret": "wrong" }))).toBe(false);
    expect(isAuthorizedCronRequest(req({ authorization: "Bearer wrong" }))).toBe(false);
    expect(isAuthorizedCronRequest(req({ authorization: "s3cret" }))).toBe(false);
  });

  it("x-cron-secret と Bearer のどちらでも通る", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isAuthorizedCronRequest(req({ "x-cron-secret": "s3cret" }))).toBe(true);
    expect(isAuthorizedCronRequest(req({ authorization: "Bearer s3cret" }))).toBe(true);
  });

  it("OIDCのBearerが付いていても x-cron-secret が正しければ通る", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(
      isAuthorizedCronRequest(req({ authorization: "Bearer oidc-token", "x-cron-secret": "s3cret" }))
    ).toBe(true);
  });
});
