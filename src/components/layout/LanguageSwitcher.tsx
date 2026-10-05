"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/constants/locales";

/** 各言語の自称表記。UIの翻訳対象ではなく、どの言語を選んでいても同じ表記で並べる */
export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  ja: "日本語",
  en: "English",
  pt: "Português",
  th: "ไทย",
  "zh-TW": "繁體中文",
  zh: "简体中文",
  vi: "Tiếng Việt",
};

const LOCALES = Object.entries(LOCALE_LABELS) as [SupportedLocale, string][];

export function LanguageSwitcher() {
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(nextLocale: SupportedLocale) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <select
      value={locale}
      onChange={(event) => handleChange(event.target.value as SupportedLocale)}
      aria-label="Language"
      className="text-base px-1 py-0.5 rounded border border-border bg-background font-semibold text-primary cursor-pointer"
    >
      {LOCALES.map(([value, label]) => (
        <option key={value} value={value} lang={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
