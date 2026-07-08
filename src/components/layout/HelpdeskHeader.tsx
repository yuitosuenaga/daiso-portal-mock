"use client";

import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";

export function HelpdeskHeader() {
  const t = useTranslations("helpdeskHeader");

  return (
    <header className="h-14 fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 bg-white border-b border-border shadow-sm">
      <Link href="/helpdesk" className="flex items-center gap-3 min-w-0">
        <Logo />
        <span className="hidden sm:inline truncate font-semibold text-base text-foreground">
          {t("title")}
        </span>
        <Badge className="hidden sm:inline-flex">{t("badge")}</Badge>
      </Link>
      <div className="flex items-center gap-4 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeftRight className="h-4 w-4 sm:hidden" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">
            {t("switchToApplicant")}
          </span>
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
