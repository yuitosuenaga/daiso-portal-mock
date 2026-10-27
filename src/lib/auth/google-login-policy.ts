// Googleログインの可否判定（副作用なしの純関数）。DB・env・Cookieには依存しない。

export type GoogleLoginPortal = "applicant" | "helpdesk";

export type GoogleLoginErrorCode =
  | "domain_not_allowed"
  | "email_not_verified"
  | "not_registered"
  | "account_inactive";

/** カンマ区切りの許可ドメイン文字列を正規化（trim・小文字化・空要素除去・重複除去）する。 */
export function parseAllowedEmailDomains(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const domains = raw
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter((d) => d.length > 0);
  return domains.filter((d, i) => domains.indexOf(d) === i);
}

/** メールアドレスを比較用に正規化（trim・小文字化）する。 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * メールアドレスのドメインが許可リストに完全一致するか。
 * サブドメイン（例: `sub.example.com`は`example.com`では許可されない）は許可しない。
 * 許可リストが空の場合は常にfalse（fail closed）。
 */
export function isEmailDomainAllowed(
  email: string,
  allowedDomains: readonly string[]
): boolean {
  if (allowedDomains.length === 0) return false;
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  // 「@」が無い・ローカル部が空・ドメイン部が空・「@」が複数あるものは不正
  if (at <= 0 || at === normalized.length - 1) return false;
  if (normalized.indexOf("@") !== at) return false;
  const domain = normalized.slice(at + 1);
  return allowedDomains.some((allowed) => allowed === domain);
}

/**
 * ヘルプデスク担当者の自動作成を許可するドメインを決める。
 * フラグが文字列"true"のときのみ有効で、「自動作成ドメイン ∩ 許可ドメイン」を返す。
 * それ以外（未設定・"TRUE"・"1"等）は空（=自動作成しない）。
 */
export function resolveAutoProvisionDomains(
  flag: string | undefined | null,
  rawDomains: string | undefined | null,
  allowedDomains: readonly string[]
): string[] {
  if (flag !== "true") return [];
  return parseAllowedEmailDomains(rawDomains).filter((d) =>
    allowedDomains.includes(d)
  );
}

/**
 * Googleログイン時にHelpdeskStaffを自動作成してよいか。
 * メールのドメインが自動作成ドメインに完全一致し、かつGoogle Workspaceのホストドメイン(hd)が
 * 同じドメインであること（Workspace管理外の個人Googleアカウントを排除する）。
 */
export function canAutoProvisionHelpdesk(input: {
  email: string;
  hostedDomain: string | null | undefined;
  autoProvisionDomains: readonly string[];
}): boolean {
  if (!isEmailDomainAllowed(input.email, input.autoProvisionDomains)) return false;
  if (!input.hostedDomain) return false;
  const domain = normalizeEmail(input.email).split("@")[1];
  return input.hostedDomain.trim().toLowerCase() === domain;
}

const DISPLAY_NAME_MAX_LENGTH = 100;

/** Googleのnameから表示名を作る（トリム・制御文字除去・100文字で切る。空ならメールのローカル部）。 */
export function deriveStaffDisplayName(
  name: string | null | undefined,
  email: string
): string {
  const cleaned = (name ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
    .trim();
  const base = cleaned || normalizeEmail(email).split("@")[0];
  return Array.from(base).slice(0, DISPLAY_NAME_MAX_LENGTH).join("");
}

export interface GoogleLoginInput {
  email: string | null | undefined;
  emailVerified: boolean | null | undefined;
  allowedDomains: readonly string[];
}

/**
 * DB照会の前に行える検査（メール有無・email_verified・許可ドメイン）。
 * 通過した場合はnull、拒否する場合はエラーコードを返す。
 */
export function checkGoogleProfile(
  input: GoogleLoginInput
): GoogleLoginErrorCode | null {
  if (!input.email) return "not_registered";
  // 厳密にtrueのときのみ許可（"true"文字列・undefinedは拒否）
  if (input.emailVerified !== true) return "email_not_verified";
  if (!isEmailDomainAllowed(input.email, input.allowedDomains)) {
    return "domain_not_allowed";
  }
  return null;
}

/**
 * プロフィール検査＋DBアカウントの存在・有効性を合わせた最終判定。
 * `account`はDBから取得した対応アカウント（無ければnull）。HelpdeskStaffは
 * 無効化の概念が無いため`isActive`を持たない（未指定は有効扱い）。
 */
export function decideGoogleLogin(
  input: GoogleLoginInput & { account: { isActive?: boolean } | null }
): { ok: true } | { ok: false; error: GoogleLoginErrorCode } {
  const profileError = checkGoogleProfile(input);
  if (profileError) return { ok: false, error: profileError };
  if (!input.account) return { ok: false, error: "not_registered" };
  if (input.account.isActive === false) {
    return { ok: false, error: "account_inactive" };
  }
  return { ok: true };
}

/** ログイン開始時のポータル・ロケールをCookie値にエンコードする。 */
export function encodeLoginContext(portal: GoogleLoginPortal, locale: string): string {
  return `${portal}:${locale}`;
}

export function decodeLoginContext(
  value: string | undefined,
  validLocales: readonly string[],
  defaultLocale: string
): { portal: GoogleLoginPortal; locale: string } {
  const [portal, locale] = (value ?? "").split(":");
  return {
    portal: portal === "helpdesk" ? "helpdesk" : "applicant",
    locale: validLocales.includes(locale) ? locale : defaultLocale,
  };
}

/** 拒否時のリダイレクト先（ロケール付きログイン画面＋エラーコード）。 */
export function buildGoogleLoginErrorPath(
  portal: GoogleLoginPortal,
  locale: string,
  error: GoogleLoginErrorCode
): string {
  const base =
    portal === "helpdesk" ? `/${locale}/helpdesk/login` : `/${locale}/login`;
  return `${base}?googleError=${error}`;
}

export const GOOGLE_LOGIN_ERROR_CODES: readonly GoogleLoginErrorCode[] = [
  "domain_not_allowed",
  "email_not_verified",
  "not_registered",
  "account_inactive",
];

export function parseGoogleLoginError(
  value: string | string[] | undefined
): GoogleLoginErrorCode | null {
  const v = Array.isArray(value) ? value[0] : value;
  return GOOGLE_LOGIN_ERROR_CODES.find((c) => c === v) ?? null;
}
