import { describe, expect, it } from "vitest";

import { resolveLoginRedirectPath } from "@/lib/server/route-protection";

const LOCALES = ["ja", "en"] as const;
const DEFAULT_LOCALE = "ja";

const applicantClaims = {
  role: "applicant" as const,
  applicantUserId: "applicant-1",
  companyId: "company-1",
  companyName: "Test Co.",
};

const helpdeskClaims = {
  role: "helpdesk" as const,
  staffId: "staff-1",
  displayName: "田中 太郎",
};

describe("resolveLoginRedirectPath", () => {
  it("申請者側ログイン画面は誰でもリダイレクトなし", () => {
    expect(
      resolveLoginRedirectPath("/ja/login", null, LOCALES, DEFAULT_LOCALE)
    ).toBeNull();
    expect(
      resolveLoginRedirectPath("/ja/login", helpdeskClaims, LOCALES, DEFAULT_LOCALE)
    ).toBeNull();
  });

  it("ヘルプデスク側ログイン画面は誰でもリダイレクトなし", () => {
    expect(
      resolveLoginRedirectPath("/en/helpdesk/login", null, LOCALES, DEFAULT_LOCALE)
    ).toBeNull();
  });

  it("未ログインで申請者側保護パスにアクセスすると申請者ログインへリダイレクトする", () => {
    expect(
      resolveLoginRedirectPath("/ja/inquiry/new", null, LOCALES, DEFAULT_LOCALE)
    ).toBe("/ja/login");
    expect(
      resolveLoginRedirectPath("/ja", null, LOCALES, DEFAULT_LOCALE)
    ).toBe("/ja/login");
  });

  it("未ログインでヘルプデスク側保護パスにアクセスするとヘルプデスクログインへリダイレクトする", () => {
    expect(
      resolveLoginRedirectPath("/en/helpdesk/inquiries", null, LOCALES, DEFAULT_LOCALE)
    ).toBe("/en/helpdesk/login");
    expect(
      resolveLoginRedirectPath("/en/helpdesk", null, LOCALES, DEFAULT_LOCALE)
    ).toBe("/en/helpdesk/login");
  });

  it("申請者セッションでヘルプデスク側保護パスにアクセスするとヘルプデスクログインへリダイレクトする", () => {
    expect(
      resolveLoginRedirectPath(
        "/ja/helpdesk/inquiries",
        applicantClaims,
        LOCALES,
        DEFAULT_LOCALE
      )
    ).toBe("/ja/helpdesk/login");
  });

  it("ヘルプデスクセッションで申請者側保護パスにアクセスすると申請者ログインへリダイレクトする", () => {
    expect(
      resolveLoginRedirectPath("/ja/inquiry/new", helpdeskClaims, LOCALES, DEFAULT_LOCALE)
    ).toBe("/ja/login");
  });

  it("適切なセッションがあればリダイレクトしない", () => {
    expect(
      resolveLoginRedirectPath("/ja/inquiry/new", applicantClaims, LOCALES, DEFAULT_LOCALE)
    ).toBeNull();
    expect(
      resolveLoginRedirectPath(
        "/en/helpdesk/inquiries",
        helpdeskClaims,
        LOCALES,
        DEFAULT_LOCALE
      )
    ).toBeNull();
  });

  it("ロケールプレフィックスがない場合はデフォルトロケールを使う", () => {
    expect(resolveLoginRedirectPath("/helpdesk", null, LOCALES, DEFAULT_LOCALE)).toBe(
      "/ja/helpdesk/login"
    );
  });
});
