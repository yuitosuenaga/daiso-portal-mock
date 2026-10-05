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
 * 日本語の原文を全対応言語（`TRANSLATED_LOCALES`）へ1回のAPI呼び出しで自動翻訳する。
 *
 * 例外は送出しない。翻訳に失敗しても、呼び出し元は`ja`のみで保存を続行し、
 * 返却された`failedLocales`をもとに再翻訳を促せる（未翻訳のlocaleは表示側で`ja`にフォールバックする）。
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

  try {
    const { translations } = await translator.translateFields({
      fields: source,
      sourceLocale: "ja",
      targetLocales: locales,
    });
    return {
      translations: Object.fromEntries(locales.map((locale) => [locale, translations[locale]])),
      failedLocales: [],
    };
  } catch (error) {
    console.error("[auto-translation] translation failed:", error);
    return { translations: {}, failedLocales: [...locales] };
  }
}
