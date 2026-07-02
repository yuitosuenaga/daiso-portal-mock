"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

type SupportedLocale = "ja" | "en";

const LOCALES: { value: SupportedLocale; label: string }[] = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
];

export function LanguageSwitcher() {
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(nextLocale: SupportedLocale) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map((item, index) => (
        <span key={item.value} className="flex items-center">
          {index > 0 && (
            <span className="mx-1 text-muted-foreground text-sm">|</span>
          )}
          <button
            onClick={() => handleChange(item.value)}
            className={`text-sm px-1 py-0.5 rounded transition-colors ${
              locale === item.value
                ? "font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={locale === item.value}
          >
            {item.label}
          </button>
        </span>
      ))}
    </div>
  );
}
