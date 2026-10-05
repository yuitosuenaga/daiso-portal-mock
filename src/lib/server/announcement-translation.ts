import "server-only";

import { createHash } from "crypto";

import { TRANSLATED_LOCALES } from "@/lib/constants/locales";
import { autoTranslateFields } from "@/lib/server/auto-translation";
import type { AnnouncementTranslationView } from "@/types/announcement";

export function hashAnnouncementSource(title: string, body: string): string {
  return createHash("sha256").update(`${title}\u0000${body}`).digest("hex");
}

export interface BuildAnnouncementTranslationsResult {
  /** 保存すべき翻訳行の全体（既存のmanual行・最新のmachine行・今回翻訳できた行） */
  translations: AnnouncementTranslationView[];
  /** 今回翻訳が必要だったが失敗したlocale。空なら全言語が最新 */
  failedLocales: string[];
}

/**
 * ja本文（タイトル・本文）から全対応言語（`TRANSLATED_LOCALES`）の翻訳行を組み立てる。
 *
 * - 既存の`manual`行（人が編集した翻訳）は上書きしない。
 * - 既存の`machine`行は、`sourceHash`が現在のja本文と一致すれば最新とみなし再翻訳しない。
 * - それ以外のlocale（未翻訳・ja変更後の古い機械翻訳）のみ`autoTranslateFields`で翻訳する。
 * - 翻訳に失敗したlocaleは`failedLocales`に入れる。`keepExistingOnFailure`が偽（既定）なら
 *   古い機械翻訳行も保存対象から外す（古い内容を残さない）。真なら既存行をそのまま残す。
 * - `TRANSLATED_LOCALES`以外のlocale（過去に手動追加された言語）の既存行は変更せず残す。
 *
 * 例外は送出しない（`autoTranslateFields`が例外を送出しないため）。
 */
export async function buildAnnouncementTranslations(
  source: { title: string; body: string },
  existing: readonly AnnouncementTranslationView[] = [],
  options?: { keepExistingOnFailure?: boolean }
): Promise<BuildAnnouncementTranslationsResult> {
  const hash = hashAnnouncementSource(source.title, source.body);
  const existingByLocale = new Map(existing.map((row) => [row.locale, row]));

  const kept: AnnouncementTranslationView[] = existing.filter(
    (row) => !(TRANSLATED_LOCALES as readonly string[]).includes(row.locale)
  );
  const needed: string[] = [];

  for (const locale of TRANSLATED_LOCALES) {
    const row = existingByLocale.get(locale);
    if (row && (row.source ?? "manual") === "manual") {
      kept.push(row);
    } else if (row && row.sourceHash === hash) {
      kept.push(row);
    } else {
      needed.push(locale);
    }
  }

  if (needed.length === 0) {
    return { translations: kept, failedLocales: [] };
  }

  const result = await autoTranslateFields(
    { title: source.title, body: source.body },
    { locales: needed }
  );

  const failedLocales = new Set(result.failedLocales);
  const translations = [...kept];
  for (const locale of needed) {
    const fields = result.translations[locale];
    const title = fields?.title?.trim();
    const body = fields?.body?.trim();
    if (!failedLocales.has(locale) && title && body) {
      translations.push({ locale, title, body, source: "machine", sourceHash: hash });
      continue;
    }
    failedLocales.add(locale);
    const stale = existingByLocale.get(locale);
    if (options?.keepExistingOnFailure && stale) {
      translations.push(stale);
    }
  }

  return { translations, failedLocales: Array.from(failedLocales) };
}
