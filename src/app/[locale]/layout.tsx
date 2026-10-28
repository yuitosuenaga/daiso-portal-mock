import { NextIntlClientProvider } from "next-intl";
import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { DEFAULT_LOCALE } from "@/lib/constants/locales";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  const resolved = routing.locales.includes(
    locale as (typeof routing.locales)[number],
  )
    ? locale
    : DEFAULT_LOCALE;
  const t = await getTranslations({ locale: resolved, namespace: "header" });
  const portalName = t("portalName");
  return {
    title: { template: `%s | ${portalName}`, default: portalName },
    description: portalName,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
