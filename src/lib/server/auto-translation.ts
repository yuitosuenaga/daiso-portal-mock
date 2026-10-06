import "server-only";

import { TRANSLATED_LOCALES } from "@/lib/constants/locales";
import { getFieldsTranslator } from "@/lib/server/translation-service";

export type AutoTranslatedFields = Record<string, Record<string, string>>;

export interface AutoTranslationResult {
  /** locale→（フィールドキー→訳文）。翻訳できたlocaleのみ含む */
  translations: AutoTranslatedFields;
  /** 翻訳できなかったlocale（APIキー未設定・API失敗・出力欠落）。空なら全言語成功 */
  failedLocales: string[];
}

/**
 * 日本語の原文を全対応言語（`TRANSLATED_LOCALES`）へ、言語ごとに並列のAPI呼び出しで自動翻訳する。
 *
 * 例外は送出しない。翻訳に失敗しても、呼び出し元は`ja`のみで保存を続行し、
 * 返却された`failedLocales`（失敗した言語だけ）をもとに再翻訳を促せる（未翻訳のlocaleは表示側で`ja`にフォールバックする）。
 * 空文字・空白のみのフィールドは翻訳対象から除外する。翻訳対象が1つも無い場合はAPIを呼ばない。
 */
export async function autoTranslateFields(
  fields: Record<string, string | null | undefined>,
  options?: { locales?: readonly string[] }
): Promise<AutoTranslationResult> {
  const locales = options?.locales ?? TRANSLATED_LOCALES;
  const source = Object.fromEntries(
    Object.entries(fields).filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()))
  );

  if (Object.keys(source).length === 0 || locales.length === 0) {
    return { translations: {}, failedLocales: [] };
  }

  const translator = getFieldsTranslator();
  if (!translator) {
    return { translations: {}, failedLocales: [...locales] };
  }

  // 言語ごとに並列で翻訳する。1回で全言語を出力させると出力が長くなりタイムアウトしやすく、
  // 1言語の失敗で全言語が失敗扱いになる。言語ごとに分ければ、失敗した言語だけを失敗として返せる。
  const results = await Promise.all(
    locales.map(async (locale) => {
      try {
        const { translations } = await translator.translateFields({
          fields: source,
          sourceLocale: "ja",
          targetLocales: [locale],
        });
        return { locale, fields: translations[locale] };
      } catch (error) {
        console.error(`[auto-translation] translation to "${locale}" failed:`, error);
        return { locale, fields: undefined };
      }
    })
  );

  const translations: AutoTranslatedFields = {};
  const failedLocales: string[] = [];
  for (const { locale, fields: translated } of results) {
    if (translated) translations[locale] = translated;
    else failedLocales.push(locale);
  }

  return { translations, failedLocales };
}
