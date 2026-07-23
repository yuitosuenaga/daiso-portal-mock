"use client";

import { ArrowLeftRight, LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { APPLICANT_NAV_ITEMS } from "./nav-items";

export function Header() {
  const t = useTranslations("header");
  const locale = useLocale();

  return (
    <header className="h-16 fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-3 px-4 bg-white border-b border-border shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <MobileNav items={APPLICANT_NAV_ITEMS} namespace="nav" rootHref="/" />
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-3">
          <Logo />
          <span className="hidden sm:inline whitespace-nowrap text-lg font-semibold text-foreground">
            {t("portalName")}
          </span>
          <span className="hidden xl:inline text-lg font-medium text-muted-foreground whitespace-nowrap">
            {" / "}
            {t("screenName")}
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <Link
          href="/helpdesk"
          className="flex items-center gap-1.5 text-base text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeftRight className="h-5 w-5 xl:hidden" aria-hidden="true" />
          <span className="sr-only xl:not-sr-only whitespace-nowrap">
            {t("switchToHelpdesk")}
          </span>
        </Link>
        <LanguageSwitcher />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
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
