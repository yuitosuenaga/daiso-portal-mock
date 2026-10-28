import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ NextIntlClientProvider: () => null }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getMessages: async () => ({}),
  getTranslations: async ({ locale }: { locale: string; namespace: string }) =>
    (key: string) => `${key}@${locale}`,
}));

import { generateMetadata } from "./layout";

describe("[locale]/layout generateMetadata", () => {
  it("title の template と default が header.portalName から作られる", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: "en" }),
    });
    expect(meta.title).toEqual({
      template: "%s | portalName@en",
      default: "portalName@en",
    });
  });

  it("未知のロケールは既定ロケールで作られる", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: "xx" }),
    });
    expect(meta.title).toEqual({
      template: "%s | portalName@ja",
      default: "portalName@ja",
    });
  });

  it("description は header.portalName のロケール別の値になる", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: "en" }),
    });
    expect(meta.description).toBe("portalName@en");
    const fallback = await generateMetadata({
      params: Promise.resolve({ locale: "xx" }),
    });
    expect(fallback.description).toBe("portalName@ja");
  });
});
