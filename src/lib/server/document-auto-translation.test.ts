import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auto-translation", () => ({ autoTranslateFields: vi.fn() }));

import { autoTranslateFields } from "@/lib/server/auto-translation";
import {
  findMissingLocales,
  planCategoryTranslations,
  planDocumentTranslations,
  translateCategoryNames,
  translateDocumentTexts,
} from "@/lib/server/document-auto-translation";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("translateDocumentTexts", () => {
  it("翻訳できたlocaleのみtranslationsに含め、空のdescriptionはundefinedにする", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: { en: { title: "T", description: " " }, vi: { title: "V" } },
      failedLocales: [],
    });

    const result = await translateDocumentTexts({ title: "題" }, ["en", "vi"]);

    expect(result.translations).toEqual([
      { locale: "en", title: "T", description: undefined },
      { locale: "vi", title: "V", description: undefined },
    ]);
    expect(result.failedLocales).toEqual([]);
  });

  it("翻訳結果にtitleが無いlocaleは失敗扱いにする", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: { en: { title: "T" }, vi: {} },
      failedLocales: [],
    });

    const result = await translateDocumentTexts({ title: "題" }, ["en", "vi"]);

    expect(result.translations.map((t) => t.locale)).toEqual(["en"]);
    expect(result.failedLocales).toEqual(["vi"]);
  });
});

describe("planDocumentTranslations", () => {
  const existing = {
    title: "題",
    description: "説明",
    translations: [{ locale: "en", title: "Title" }],
  };

  it("新規（既存なし）は翻訳する", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({ translations: {}, failedLocales: [] });

    await planDocumentTranslations({ title: "題" }, null);

    expect(autoTranslateFields).toHaveBeenCalledTimes(1);
  });

  it("原文が同じなら翻訳せず既存翻訳を維持する（前後の空白は無視）", async () => {
    const result = await planDocumentTranslations({ title: " 題 ", description: "説明" }, existing);

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(result.translations).toBe(existing.translations);
  });

  it("説明が変わったら再翻訳する", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({ translations: {}, failedLocales: [] });

    await planDocumentTranslations({ title: "題", description: "別の説明" }, existing);

    expect(autoTranslateFields).toHaveBeenCalledTimes(1);
  });
});

describe("カテゴリ名の翻訳", () => {
  it("translateCategoryNamesは翻訳できたlocaleのみ返す", async () => {
    vi.mocked(autoTranslateFields).mockResolvedValue({
      translations: { en: { name: "Cat" } },
      failedLocales: ["vi"],
    });

    const result = await translateCategoryNames("分類", ["en", "vi"]);

    expect(result.translations).toEqual([{ locale: "en", name: "Cat" }]);
    expect(result.failedLocales).toEqual(["vi"]);
  });

  it("planCategoryTranslationsは名称が同じなら既存翻訳を維持する", async () => {
    const translations = [{ locale: "en", name: "Cat" }];

    const result = await planCategoryTranslations("分類", { name: "分類", translations });

    expect(autoTranslateFields).not.toHaveBeenCalled();
    expect(result.translations).toBe(translations);
  });
});

describe("findMissingLocales", () => {
  it("既存に無い翻訳対象localeを返す", () => {
    expect(findMissingLocales(["en", "vi"])).toEqual(["pt", "th", "zh-TW", "zh"]);
  });
});
