/**
 * ポータルが対応する全言語。右上の言語切替・全言語翻訳の保持対象。
 * 簡体字中国語は既存データ（`COUNTRY_CONTENT_LANGUAGE`等）に合わせてコード`zh`を用いる。
 */
export const SUPPORTED_LOCALES = ["ja", "en", "pt", "th", "zh-TW", "zh", "vi"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "ja";

/** 翻訳テーブルに保持する言語（原文言語`ja`は親テーブルが正のため含めない） */
export const TRANSLATED_LOCALES = SUPPORTED_LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE,
);
