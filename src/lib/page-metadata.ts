import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/constants/locales";

type LocaleParams = { params: Promise<{ locale: string }> };

function resolveLocale(locale: string): string {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
    ? locale
    : DEFAULT_LOCALE;
}

/**
 * 画面ごとの `<title>` 用 metadata を返す。
 * 既存の見出しキー(namespace + key)を再利用し、`[locale]/layout.tsx` の
 * `title.template`(`%s | ポータル名`)に差し込まれる。
 * 認可・DB 呼び出しは行わず、翻訳の取得のみ行う(generateMetadata はページ本体と並行して走るため)。
 * 未対応のロケールは既定ロケールにフォールバックする。
 */
export async function buildPageMetadata(
  locale: string,
  namespace: string,
  key: string,
): Promise<Metadata> {
  const t = (await getTranslations({
    locale: resolveLocale(locale),
    namespace,
  })) as unknown as (key: string) => string;
  return { title: t(key) };
}

/** ページの `export const generateMetadata = createPageMetadata(ns, key)` 用。 */
export function createPageMetadata(namespace: string, key: string) {
  return async ({ params }: LocaleParams): Promise<Metadata> => {
    const { locale } = await params;
    return buildPageMetadata(locale, namespace, key);
  };
}
