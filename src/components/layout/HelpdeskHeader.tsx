"use client";

import { ArrowLeftRight, LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";

export function HelpdeskHeader() {
  const t = useTranslations("helpdeskHeader");
  const locale = useLocale();

  return (
    <header className="h-16 fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 bg-white border-b border-border shadow-sm">
      <Link href="/helpdesk" className="flex items-center gap-3 min-w-0">
        <Logo />
        <span className="hidden sm:inline truncate text-lg text-foreground">
          <span className="font-semibold">{t("portalName")}</span>
          <span className="font-medium text-muted-foreground">
            {" / "}
            {t("screenName")}
          </span>
        </span>
      </Link>
      <div className="flex items-center gap-4 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-base text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeftRight className="h-5 w-5 sm:hidden" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">
            {t("switchToApplicant")}
          </span>
        </Link>
        <LanguageSwitcher />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: `/${locale}/helpdesk/login` })}
          aria-label={t("logout")}
          className="flex items-center gap-1.5 text-base text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline">{t("logout")}</span>
        </button>
      </div>
    </header>
  );
}
