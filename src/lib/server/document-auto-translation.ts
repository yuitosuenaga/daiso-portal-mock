import "server-only";

import { TRANSLATED_LOCALES } from "@/lib/constants/locales";
import { autoTranslateFields } from "@/lib/server/auto-translation";

interface TranslatedDocumentText {
  locale: string;
  title: string;
  description?: string;
}

interface TranslatedCategoryText {
  locale: string;
  name: string;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/**
 * 資料のタイトル・説明（ja）を翻訳対象言語へ自動翻訳する。翻訳できた言語のみ`translations`に
 * 含め、できなかった言語は`failedLocales`に入れる（例外は送出しない）。
 * `locales`を指定すると、その言語だけを翻訳する（再翻訳用）。
 */
export async function translateDocumentTexts(
  source: { title: string; description?: string | null },
  locales: readonly string[] = TRANSLATED_LOCALES
): Promise<{ translations: TranslatedDocumentText[]; failedLocales: string[] }> {
  if (locales.length === 0) {
    return { translations: [], failedLocales: [] };
  }

  const result = await autoTranslateFields(
    { title: source.title, description: source.description },
    { locales }
  );

  const translations: TranslatedDocumentText[] = [];
  const failed = new Set(result.failedLocales);
  for (const locale of locales) {
    if (failed.has(locale)) continue;
    const fields = result.translations[locale];
    const title = fields?.title?.trim();
    if (!title) {
      failed.add(locale);
      continue;
    }
    const description = fields.description?.trim();
    translations.push({ locale, title, description: description || undefined });
  }

  return { translations, failedLocales: locales.filter((locale) => failed.has(locale)) };
}

/**
 * 資料の保存時に保存する翻訳一式を決める。
 * - 新規作成、またはjaのタイトル・説明が変わった場合: 全言語を再翻訳し、成功した言語のみ保存する
 *   （古い原文に対する翻訳は残さない）。
 * - jaの原文が変わらない編集: 既存の翻訳をそのまま維持し、APIを呼ばない。
 */
export async function planDocumentTranslations(
  source: { title: string; description?: string | null },
  existing: {
    title: string;
    description?: string | null;
    translations: TranslatedDocumentText[];
  } | null
): Promise<{ translations: TranslatedDocumentText[]; failedLocales: string[] }> {
  if (
    existing &&
    normalize(existing.title) === normalize(source.title) &&
    normalize(existing.description) === normalize(source.description)
  ) {
    return { translations: existing.translations, failedLocales: [] };
  }

  return translateDocumentTexts(source);
}

/** カテゴリ名（ja）を翻訳対象言語へ自動翻訳する。仕様は`translateDocumentTexts`と同じ。 */
export async function translateCategoryNames(
  name: string,
  locales: readonly string[] = TRANSLATED_LOCALES
): Promise<{ translations: TranslatedCategoryText[]; failedLocales: string[] }> {
  if (locales.length === 0) {
    return { translations: [], failedLocales: [] };
  }

  const result = await autoTranslateFields({ name }, { locales });

  const translations: TranslatedCategoryText[] = [];
  const failed = new Set(result.failedLocales);
  for (const locale of locales) {
    if (failed.has(locale)) continue;
    const translated = result.translations[locale]?.name?.trim();
    if (!translated) {
      failed.add(locale);
      continue;
    }
    translations.push({ locale, name: translated });
  }

  return { translations, failedLocales: locales.filter((locale) => failed.has(locale)) };
}

/** カテゴリ保存時の翻訳決定。jaの名称が変わらない編集では既存翻訳を維持する。 */
export async function planCategoryTranslations(
  name: string,
  existing: { name: string; translations: TranslatedCategoryText[] } | null
): Promise<{ translations: TranslatedCategoryText[]; failedLocales: string[] }> {
  if (existing && normalize(existing.name) === normalize(name)) {
    return { translations: existing.translations, failedLocales: [] };
  }

  return translateCategoryNames(name);
}

/** 既存翻訳に存在しない言語（再翻訳対象）を返す。 */
export function findMissingLocales(
  existingLocales: readonly string[],
  locales: readonly string[] = TRANSLATED_LOCALES
): string[] {
  const present = new Set(existingLocales);
  return locales.filter((locale) => !present.has(locale));
}
