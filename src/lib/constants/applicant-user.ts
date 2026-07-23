// 申請者アカウント（ApplicantUser）管理機能の定数。

/** 初期パスワード・再設定パスワードの最小文字数要件。 */
export const APPLICANT_USER_PASSWORD_MIN_LENGTH = 8;

/**
 * 申請者アカウントの通知言語（`preferredLocale`）として選択可能な言語コード一覧。
 * 海外販社担当者が用いる言語を含む。将来の言語追加は本定数への追記で行う。
 */
export const APPLICANT_USER_PREFERRED_LOCALE_CODES = [
  "en",
  "ja",
  "zh",
  "ko",
  "th",
  "vi",
  "id",
  "ms",
  "tl",
] as const;

/**
 * 通知言語の既定値。Prismaスキーマの`ApplicantUser.preferredLocale`の
 * `@default("en")`と一致させる。
 */
export const APPLICANT_USER_DEFAULT_LOCALE = "en";
