import { describe, expect, it } from "vitest";

import {
  buildGoogleLoginErrorPath,
  checkGoogleProfile,
  decideGoogleLogin,
  canAutoProvisionHelpdesk,
  decodeLoginContext,
  deriveStaffDisplayName,
  encodeLoginContext,
  isEmailDomainAllowed,
  parseAllowedEmailDomains,
  parseGoogleLoginError,
  resolveAutoProvisionDomains,
} from "@/lib/auth/google-login-policy";

describe("parseAllowedEmailDomains", () => {
  it("カンマ区切りを分割し、前後空白・大文字小文字・先頭@を正規化する", () => {
    expect(parseAllowedEmailDomains(" Example.com , @Foo.CO.jp ,, ")).toEqual([
      "example.com",
      "foo.co.jp",
    ]);
  });

  it("重複を除去する", () => {
    expect(parseAllowedEmailDomains("a.com,A.com")).toEqual(["a.com"]);
  });

  it("未設定・空文字は空配列", () => {
    expect(parseAllowedEmailDomains(undefined)).toEqual([]);
    expect(parseAllowedEmailDomains("")).toEqual([]);
    expect(parseAllowedEmailDomains("  , ")).toEqual([]);
  });
});

describe("isEmailDomainAllowed", () => {
  const allowed = ["example.com", "corp.example.jp"];

  it("許可ドメイン（複数のうちいずれか）を許可する", () => {
    expect(isEmailDomainAllowed("a@example.com", allowed)).toBe(true);
    expect(isEmailDomainAllowed("a@corp.example.jp", allowed)).toBe(true);
  });

  it("メールの大文字小文字・前後空白を無視する", () => {
    expect(isEmailDomainAllowed(" Taro@EXAMPLE.Com ", allowed)).toBe(true);
  });

  it("サブドメインは許可しない", () => {
    expect(isEmailDomainAllowed("a@sub.example.com", allowed)).toBe(false);
  });

  it("末尾一致のなりすましドメインを許可しない", () => {
    expect(isEmailDomainAllowed("a@evilexample.com", allowed)).toBe(false);
    expect(isEmailDomainAllowed("a@example.com.evil.test", allowed)).toBe(false);
  });

  it("許可リストが空なら全拒否（fail closed）", () => {
    expect(isEmailDomainAllowed("a@example.com", [])).toBe(false);
  });

  it("不正な形式のメールは拒否する", () => {
    expect(isEmailDomainAllowed("example.com", allowed)).toBe(false);
    expect(isEmailDomainAllowed("@example.com", allowed)).toBe(false);
    expect(isEmailDomainAllowed("a@", allowed)).toBe(false);
    expect(isEmailDomainAllowed("a@evil.test@example.com", allowed)).toBe(false);
  });
});

describe("checkGoogleProfile", () => {
  const base = {
    email: "a@example.com",
    emailVerified: true,
    allowedDomains: ["example.com"],
  };

  it("許可ドメイン・email_verified=trueなら通過", () => {
    expect(checkGoogleProfile(base)).toBeNull();
  });

  it("email_verified=false・未定義・文字列は拒否", () => {
    expect(checkGoogleProfile({ ...base, emailVerified: false })).toBe(
      "email_not_verified"
    );
    expect(checkGoogleProfile({ ...base, emailVerified: undefined })).toBe(
      "email_not_verified"
    );
    expect(
      checkGoogleProfile({ ...base, emailVerified: "true" as unknown as boolean })
    ).toBe("email_not_verified");
  });

  it("許可外ドメインは拒否", () => {
    expect(checkGoogleProfile({ ...base, email: "a@other.com" })).toBe(
      "domain_not_allowed"
    );
  });

  it("許可ドメイン未設定は拒否", () => {
    expect(checkGoogleProfile({ ...base, allowedDomains: [] })).toBe(
      "domain_not_allowed"
    );
  });

  it("メール無しは拒否", () => {
    expect(checkGoogleProfile({ ...base, email: undefined })).toBe(
      "not_registered"
    );
  });
});

describe("decideGoogleLogin", () => {
  const base = {
    email: "a@example.com",
    emailVerified: true,
    allowedDomains: ["example.com"],
  };

  it("有効なアカウントが登録済みなら許可", () => {
    expect(decideGoogleLogin({ ...base, account: { isActive: true } })).toEqual({
      ok: true,
    });
  });

  it("isActiveを持たないアカウント（HelpdeskStaff）は有効扱い", () => {
    expect(decideGoogleLogin({ ...base, account: {} })).toEqual({ ok: true });
  });

  it("未登録メールは拒否", () => {
    expect(decideGoogleLogin({ ...base, account: null })).toEqual({
      ok: false,
      error: "not_registered",
    });
  });

  it("無効化済みユーザーは拒否", () => {
    expect(decideGoogleLogin({ ...base, account: { isActive: false } })).toEqual({
      ok: false,
      error: "account_inactive",
    });
  });

  it("ドメイン・email_verifiedの拒否はアカウントの有無より優先する", () => {
    expect(
      decideGoogleLogin({
        ...base,
        email: "a@other.com",
        account: { isActive: true },
      })
    ).toEqual({ ok: false, error: "domain_not_allowed" });
    expect(
      decideGoogleLogin({ ...base, emailVerified: false, account: { isActive: true } })
    ).toEqual({ ok: false, error: "email_not_verified" });
  });
});

describe("ログインコンテキスト・エラーパス", () => {
  const locales = ["ja", "en"];

  it("encode/decodeが往復する", () => {
    expect(
      decodeLoginContext(encodeLoginContext("helpdesk", "en"), locales, "ja")
    ).toEqual({ portal: "helpdesk", locale: "en" });
  });

  it("不正値は申請者側・既定ロケールにフォールバックする", () => {
    expect(decodeLoginContext("x:zz", locales, "ja")).toEqual({
      portal: "applicant",
      locale: "ja",
    });
    expect(decodeLoginContext(undefined, locales, "ja")).toEqual({
      portal: "applicant",
      locale: "ja",
    });
  });

  it("ポータル別のログイン画面へエラーコード付きで戻す", () => {
    expect(buildGoogleLoginErrorPath("applicant", "ja", "not_registered")).toBe(
      "/ja/login?googleError=not_registered"
    );
    expect(buildGoogleLoginErrorPath("helpdesk", "en", "domain_not_allowed")).toBe(
      "/en/helpdesk/login?googleError=domain_not_allowed"
    );
  });

  it("parseGoogleLoginErrorは既知コードのみ受け付ける", () => {
    expect(parseGoogleLoginError("not_registered")).toBe("not_registered");
    expect(parseGoogleLoginError(["account_inactive"])).toBe("account_inactive");
    expect(parseGoogleLoginError("<script>")).toBeNull();
    expect(parseGoogleLoginError(undefined)).toBeNull();
  });
});

describe("resolveAutoProvisionDomains", () => {
  const allowed = ["example.com", "foo.co.jp"];
  it("フラグが\"true\"以外（未設定・false・TRUE・1）なら空", () => {
    for (const flag of [undefined, null, "", "false", "TRUE", "1", " true"]) {
      expect(resolveAutoProvisionDomains(flag, "example.com", allowed)).toEqual([]);
    }
  });
  it("\"true\"なら自動作成リストと許可ドメインの共通部分を返す", () => {
    expect(
      resolveAutoProvisionDomains("true", " Example.com , other.com ", allowed)
    ).toEqual(["example.com"]);
  });
  it("許可外のみ・リスト空・許可ドメイン空なら空", () => {
    expect(resolveAutoProvisionDomains("true", "other.com", allowed)).toEqual([]);
    expect(resolveAutoProvisionDomains("true", "", allowed)).toEqual([]);
    expect(resolveAutoProvisionDomains("true", undefined, allowed)).toEqual([]);
    expect(resolveAutoProvisionDomains("true", "example.com", [])).toEqual([]);
  });
});

describe("canAutoProvisionHelpdesk", () => {
  const domains = ["example.com"];
  it("メールのドメインが一致しhdも同ドメインならtrue", () => {
    expect(
      canAutoProvisionHelpdesk({
        email: "Taro@Example.com",
        hostedDomain: "example.com",
        autoProvisionDomains: domains,
      })
    ).toBe(true);
  });
  it("hdの大文字は小文字化して比較する", () => {
    expect(
      canAutoProvisionHelpdesk({
        email: "a@example.com",
        hostedDomain: "EXAMPLE.com",
        autoProvisionDomains: domains,
      })
    ).toBe(true);
  });
  it("サブドメインはfalse", () => {
    expect(
      canAutoProvisionHelpdesk({
        email: "a@sub.example.com",
        hostedDomain: "sub.example.com",
        autoProvisionDomains: domains,
      })
    ).toBe(false);
  });
  it("hd未指定・不一致はfalse", () => {
    for (const hd of [undefined, null, "", "other.com"]) {
      expect(
        canAutoProvisionHelpdesk({
          email: "a@example.com",
          hostedDomain: hd,
          autoProvisionDomains: domains,
        })
      ).toBe(false);
    }
  });
  it("リスト空はfalse", () => {
    expect(
      canAutoProvisionHelpdesk({
        email: "a@example.com",
        hostedDomain: "example.com",
        autoProvisionDomains: [],
      })
    ).toBe(false);
  });
});

describe("deriveStaffDisplayName", () => {
  it("前後をトリムする", () => {
    expect(deriveStaffDisplayName("  田中 太郎  ", "a@example.com")).toBe("田中 太郎");
  });
  it("空・空白のみ・未指定はメールのローカル部", () => {
    expect(deriveStaffDisplayName("", "Taro.Y@example.com")).toBe("taro.y");
    expect(deriveStaffDisplayName("   ", "taro@example.com")).toBe("taro");
    expect(deriveStaffDisplayName(undefined, "taro@example.com")).toBe("taro");
  });
  it("制御文字を除去する（除去後に空ならローカル部）", () => {
    expect(deriveStaffDisplayName("Ta\u0000r\no\u007f", "a@example.com")).toBe("Taro");
    expect(deriveStaffDisplayName("\u0001\u0002", "a@example.com")).toBe("a");
  });
  it("100文字で切る", () => {
    expect(deriveStaffDisplayName("あ".repeat(150), "a@example.com")).toHaveLength(100);
  });
});
