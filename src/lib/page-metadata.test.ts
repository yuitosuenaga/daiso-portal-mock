import { describe, expect, it, vi } from "vitest";

import { SUPPORTED_LOCALES } from "@/lib/constants/locales";

const messagesByLocale: Record<string, Record<string, unknown>> = {};
for (const l of SUPPORTED_LOCALES) {
  messagesByLocale[l] = (await import(`../../messages/${l}.json`)).default;
}

function lookup(locale: string, path: string): string {
  return path
    .split(".")
    .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], messagesByLocale[locale]) as string;
}

vi.mock("next-intl/server", () => ({
  getTranslations: async ({
    locale,
    namespace,
  }: {
    locale: string;
    namespace: string;
  }) => {
    return (key: string) => lookup(locale, `${namespace}.${key}`);
  },
}));

import { buildPageMetadata, createPageMetadata } from "./page-metadata";

describe("buildPageMetadata", () => {
  it.each(SUPPORTED_LOCALES)("%s では該当ロケールの見出しがタイトルになる", async (locale) => {
    const meta = await buildPageMetadata(locale, "announcements", "list.title");
    expect(meta).toEqual({ title: lookup(locale, "announcements.list.title") });
  });

  it("ロケールごとにタイトルが異なる(固定の日本語ではない)", async () => {
    const ja = await buildPageMetadata("ja", "announcements", "list.title");
    const en = await buildPageMetadata("en", "announcements", "list.title");
    expect(ja.title).toBe("お知らせ");
    expect(en.title).not.toBe(ja.title);
  });

  it("未知のロケールは既定ロケール(ja)にフォールバックする", async () => {
    const meta = await buildPageMetadata("xx", "login", "applicantTitle");
    expect(meta).toEqual({ title: lookup("ja", "login.applicantTitle") });
  });
});

describe("createPageMetadata", () => {
  it("params の locale を解決してタイトルを返す", async () => {
    const generate = createPageMetadata("login", "helpdeskTitle");
    const meta = await generate({ params: Promise.resolve({ locale: "en" }) });
    expect(meta).toEqual({ title: lookup("en", "login.helpdeskTitle") });
  });
});
