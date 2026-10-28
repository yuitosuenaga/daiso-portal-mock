// 問い合わせ・申請フォームの選択肢コード一覧（フェーズ1の仮リスト。表示ラベルは翻訳キー側で管理する）。

import type { Inquiry } from "@/types/inquiry";

/** 案件種別（category）のコード一覧。ヒアリング後に変更される前提の仮値。 */
export const INQUIRY_CATEGORY_CODES = [
  "defect",
  "order",
  "system",
  "other",
] as const satisfies readonly Inquiry["category"][];

/** 緊急度（urgency）のコード一覧。 */
export const INQUIRY_URGENCY_CODES = [
  "high",
  "medium",
  "low",
] as const satisfies readonly Inquiry["urgency"][];

/** 対応状況（status）のコード一覧。 */
export const INQUIRY_STATUS_CODES = [
  "new",
  "in_progress",
  "resolved",
] as const satisfies readonly Inquiry["status"][];

/** 対象国（country）のコード一覧（ISO 3166-1 alpha-2）。 */
export const INQUIRY_COUNTRY_CODES = [
  "JP",
  "US",
  "CN",
  "KR",
  "TH",
  "VN",
  "ID",
  "PH",
  "MY",
  "SG",
  "IN",
  "TW",
  "HK",
  "GB",
  "FR",
  "DE",
  "IT",
  "ES",
  "AU",
  "BR",
  "MX",
  "CA",
  "AE",
] as const;

/**
 * 対象国コードの表示ラベルを返す。`Company.country`は任意の文字列を保存できるため、
 * `INQUIRY_COUNTRY_CODES`に無いコードは翻訳キーが存在せず、そのままコードを返す
 * （next-intlのmissing messageを避ける）。
 */
export function inquiryCountryLabel(
  code: string,
  translate: (code: string) => string
): string {
  return (INQUIRY_COUNTRY_CODES as readonly string[]).includes(code)
    ? translate(code)
    : code;
}

/** 原文言語（originalLanguage）のコード一覧（ISO 639-1）。 */
export const INQUIRY_ORIGINAL_LANGUAGE_CODES = [
  "ja",
  "en",
  "zh",
  "zh-TW",
  "ko",
  "th",
  "vi",
  "id",
  "ms",
  "tl",
  "hi",
  "fr",
  "de",
  "es",
  "pt",
  "ar",
] as const;
