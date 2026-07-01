"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const t = useTranslations("header");

  return (
    <header className="h-14 fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 bg-white border-b border-border shadow-sm">
      <span className="font-semibold text-base text-foreground">
        {t("title")}
      </span>
      <LanguageSwitcher />
    </header>
  );
}
