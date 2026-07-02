"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";

export function HelpdeskHeader() {
  const t = useTranslations("helpdeskHeader");

  return (
    <header className="h-14 fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 bg-white border-b border-border shadow-sm">
      <div className="flex items-center gap-3">
        <Logo />
        <span className="font-semibold text-base text-foreground">
          {t("title")}
        </span>
        <Badge>{t("badge")}</Badge>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {t("switchToApplicant")}
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
