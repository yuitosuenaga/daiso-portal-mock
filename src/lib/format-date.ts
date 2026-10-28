import { REFERENCE_TIME_ZONE } from "@/lib/reference-date";

/**
 * 日付・日時表示の共通フォーマッタ。
 *
 * サーバー描画（Cloud RunはUTC）・クライアント描画（閲覧者のブラウザTZ）のどちらでも
 * 同じ表示になるよう、`timeZone`は必ず関数内で固定する（呼び出し側からは変更できない）。
 * - 日時（publishedAt・createdAt等）: JST（`REFERENCE_TIME_ZONE`）で整形する
 * - 日付のみの値（`YYYY-MM-DD`のdueDate等）: 暦日そのものとして扱い、TZ変換しない
 */

export const DATE_FORMAT_OPTIONS = {
  year: "numeric",
  month: "short",
  day: "numeric",
} as const;

export const DATE_TIME_FORMAT_OPTIONS = {
  ...DATE_FORMAT_OPTIONS,
  hour: "2-digit",
  minute: "2-digit",
} as const;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function format(
  date: Date,
  fallback: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
  timeZone: string
): string {
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
}

/** 日時をJSTの暦日で整形する（publishedAt/createdAt等）。不正な値は入力をそのまま返す。 */
export function formatDate(value: string | Date, locale: string): string {
  return format(new Date(value), String(value), locale, DATE_FORMAT_OPTIONS, REFERENCE_TIME_ZONE);
}

/** 日時をJSTの日時で整形する。optionsの既定は`DATE_TIME_FORMAT_OPTIONS`。 */
export function formatDateTime(
  value: string | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = DATE_TIME_FORMAT_OPTIONS
): string {
  return format(new Date(value), String(value), locale, options, REFERENCE_TIME_ZONE);
}

/** `YYYY-MM-DD`を暦日のまま整形する。形式が不正なら入力をそのまま返す。 */
export function formatDateOnly(value: string, locale: string): string {
  if (!DATE_ONLY_PATTERN.test(value)) return value;
  return format(new Date(`${value}T00:00:00Z`), value, locale, DATE_FORMAT_OPTIONS, "UTC");
}
