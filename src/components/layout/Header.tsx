"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";

export function Header() {
  const t = useTranslations("header");

  return (
    <header className="h-14 fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 bg-white border-b border-border shadow-sm">
      <div className="flex items-center gap-3">
        <Logo />
        <span className="font-semibold text-base text-foreground">
          {t("title")}
        </span>
      </div>
      <LanguageSwitcher />
    </header>
  );
}
