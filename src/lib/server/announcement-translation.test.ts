import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/auto-translation", () => ({
  autoTranslateFields: vi.fn(),
}));

import { autoTranslateFields } from "@/lib/server/auto-translation";
import {
  buildAnnouncementTranslations,
  hashAnnouncementSource,
} from "@/lib/server/announcement-translation";
import { TRANSLATED_LOCALES } from "@/lib/constants/locales";
import type { AnnouncementTranslationView } from "@/types/announcement";

const SOURCE = { title: "お知らせタイトル", body: "お知らせ本文" };
const HASH = hashAnnouncementSource(SOURCE.title, SOURCE.body);

function successFor(locales: readonly string[]) {
  return {
    translations: Object.fromEntries(
      locales.map((locale) => [locale, { title: `T-${locale}`, body: `B-${locale}` }])
    ),
    failedLocales: [] as string[],
  };
}

beforeEach(() => {
  vi.mocked(autoTranslateFields).mockReset();
  vi.mocked(autoTranslateFields).mockImplementation(async (_fields, options) =>
    successFor(options?.locales ?? [])
  );
});

describe("buildAnnouncementTranslations", () => {
  it("既存行が無ければ全対応言語を機械翻訳し、sourceHash付きで返す", async () => {
    const result = await buildAnnouncementTranslations(SOURCE);

    expect(result.failedLocales).toEqual([]);
    expect(result.translations.map((row) => row.locale).sort()).toEqual(
      [...TRANSLATED_LOCALES].sort()
    );
    expect(result.translations.every((row) => row.source === "machine")).toBe(true);
    expect(result.translations.every((row) => row.sourceHash === HASH)).toBe(true);
    expect(autoTranslateFields).toHaveBeenCalledWith(
      { title: SOURCE.title, body: SOURCE.body },
      { locales: [...TRANSLATED_LOCALES] }
    );
  });

  it("jaが変わっていない最新のmachine行は再翻訳しない（全て最新ならAPIを呼ばない）", async () => {
    const existing: AnnouncementTranslationView[] = TRANSLATED_LOCALES.map((locale) => ({
      locale,
      title: "old",
      body: "old",
      source: "machine",
      sourceHash: HASH,
    }));

    const result = await buildAnnouncementTranslations(SOURCE, existing);

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(result.translations).toEqual(existing);
    expect(result.failedLocales).toEqual([]);
  });

  it("jaが変わったmachine行だけ再翻訳し、manual行は上書きしない", async () => {
    const existing: AnnouncementTranslationView[] = [
      { locale: "en", title: "手動EN", body: "手動EN本文", source: "manual" },
      { locale: "pt", title: "old", body: "old", source: "machine", sourceHash: "stale" },
    ];

    const result = await buildAnnouncementTranslations(SOURCE, existing);

    const en = result.translations.find((row) => row.locale === "en");
    expect(en).toEqual(existing[0]);
    const pt = result.translations.find((row) => row.locale === "pt");
    expect(pt).toMatchObject({ title: "T-pt", source: "machine", sourceHash: HASH });
    expect(vi.mocked(autoTranslateFields).mock.calls[0][1]?.locales).not.toContain("en");
  });

  it("翻訳に失敗したlocaleはfailedLocalesに入り、保存対象から外れる（古い行も残さない）", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: {},
      failedLocales: [...TRANSLATED_LOCALES],
    });
    const existing: AnnouncementTranslationView[] = [
      { locale: "th", title: "old", body: "old", source: "machine", sourceHash: "stale" },
    ];

    const result = await buildAnnouncementTranslations(SOURCE, existing);

    expect(result.failedLocales.sort()).toEqual([...TRANSLATED_LOCALES].sort());
    expect(result.translations).toEqual([]);
  });

  it("keepExistingOnFailureなら失敗したlocaleの既存行を残す", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: {},
      failedLocales: [...TRANSLATED_LOCALES],
    });
    const stale: AnnouncementTranslationView = {
      locale: "th",
      title: "old",
      body: "old",
      source: "machine",
      sourceHash: "stale",
    };

    const result = await buildAnnouncementTranslations(SOURCE, [stale], {
      keepExistingOnFailure: true,
    });

    expect(result.translations).toEqual([stale]);
    expect(result.failedLocales.length).toBe(TRANSLATED_LOCALES.length);
  });

  it("一部のlocaleだけ失敗した場合、成功分は保存対象に含まれる", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: { en: { title: "T", body: "B" } },
      failedLocales: ["vi"],
    });

    const result = await buildAnnouncementTranslations(SOURCE);

    expect(result.translations.map((row) => row.locale)).toContain("en");
    expect(result.failedLocales).toContain("vi");
    expect(result.translations.map((row) => row.locale)).not.toContain("vi");
  });

  it("TRANSLATED_LOCALES外の既存行は変更せず残す", async () => {
    const legacy: AnnouncementTranslationView = {
      locale: "ko",
      title: "k",
      body: "k",
      source: "manual",
    };

    const result = await buildAnnouncementTranslations(SOURCE, [legacy]);

    expect(result.translations).toContainEqual(legacy);
  });
});
