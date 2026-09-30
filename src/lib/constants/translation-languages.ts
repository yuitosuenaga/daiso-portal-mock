/**
 * お知らせ等の本文を翻訳して保持できる言語（`ja`/`en`以外）。`label`は各言語の自称表記で、
 * ヘルプデスクスタッフが言語を選ぶ際の表示にのみ使う（UIの翻訳対象ではない）。
 */
export const TRANSLATION_LANGUAGES = [
  { code: "zh", label: "中文（简体）" },
  { code: "zh-TW", label: "中文（繁體）" },
  { code: "ko", label: "한국어" },
  { code: "th", label: "ไทย" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "fil", label: "Filipino" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
] as const;

export type TranslationLanguageCode = (typeof TRANSLATION_LANGUAGES)[number]["code"];

/**
 * 配信先の国（ISO 3166-1 alpha-2）ごとの本文表示言語。UI言語が`ja`以外のとき、該当言語の翻訳が
 * あればそれを優先して表示する。英語圏・本マップに無い国は`en`翻訳にフォールバックする。
 */
export const COUNTRY_CONTENT_LANGUAGE: Readonly<Record<string, TranslationLanguageCode>> = {
  CN: "zh",
  TW: "zh-TW",
  HK: "zh-TW",
  KR: "ko",
  TH: "th",
  VN: "vi",
  ID: "id",
  MY: "ms",
  PH: "fil",
  FR: "fr",
  DE: "de",
  IT: "it",
  ES: "es",
  MX: "es",
  BR: "pt",
  AE: "ar",
};

/** 言語コードから各言語の自称表記を返す（未登録はコードをそのまま返す）。 */
export function translationLanguageLabel(code: string): string {
  return TRANSLATION_LANGUAGES.find((language) => language.code === code)?.label ?? code;
}
