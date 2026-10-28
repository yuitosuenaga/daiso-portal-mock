import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { REFERENCE_TIME_ZONE } from "@/lib/reference-date";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    timeZone: REFERENCE_TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
