import { beforeEach, describe, expect, it, vi } from "vitest";

import { TRANSLATED_LOCALES } from "@/lib/constants/locales";

vi.mock("server-only", () => ({}));
const getFieldsTranslatorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/translation-service", () => ({ getFieldsTranslator: getFieldsTranslatorMock }));

import { autoTranslateFields } from "./auto-translation";

describe("autoTranslateFields", () => {
  beforeEach(() => {
    getFieldsTranslatorMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("空でないフィールドだけを、言語ごとに1回ずつ（並列で）翻訳する", async () => {
    const translateFields = vi.fn(async ({ targetLocales }: { targetLocales: string[] }) => ({
      translations: Object.fromEntries(targetLocales.map((l) => [l, { title: `${l}:題` }])),
      model: "m",
    }));
    getFieldsTranslatorMock.mockReturnValue({ translateFields });

    const result = await autoTranslateFields({ title: "題", description: " ", note: null });

    expect(translateFields).toHaveBeenCalledTimes(TRANSLATED_LOCALES.length);
    for (const locale of TRANSLATED_LOCALES) {
      expect(translateFields).toHaveBeenCalledWith({
        fields: { title: "題" },
        sourceLocale: "ja",
        targetLocales: [locale],
      });
    }
    expect(result.failedLocales).toEqual([]);
    expect(result.translations.th).toEqual({ title: "th:題" });
  });

  it("一部の言語だけ失敗した場合、失敗した言語だけをfailedLocalesに入れ、成功分は返す", async () => {
    const translateFields = vi.fn(async ({ targetLocales }: { targetLocales: string[] }) => {
      if (targetLocales[0] === "th") throw new Error("timeout");
      return {
        translations: { [targetLocales[0]]: { title: `${targetLocales[0]}:題` } },
        model: "m",
      };
    });
    getFieldsTranslatorMock.mockReturnValue({ translateFields });

    const result = await autoTranslateFields({ title: "題" });

    expect(result.failedLocales).toEqual(["th"]);
    expect(Object.keys(result.translations).sort()).toEqual(
      TRANSLATED_LOCALES.filter((l) => l !== "th").sort()
    );
  });

  it("翻訳対象が無ければAPIを呼ばない", async () => {
    const result = await autoTranslateFields({ title: "", description: null });

    expect(getFieldsTranslatorMock).not.toHaveBeenCalled();
    expect(result).toEqual({ translations: {}, failedLocales: [] });
  });

  it("APIキー未設定なら全localeを失敗として返す", async () => {
    getFieldsTranslatorMock.mockReturnValue(null);

    const result = await autoTranslateFields({ title: "題" });

    expect(result.translations).toEqual({});
    expect(result.failedLocales).toEqual([...TRANSLATED_LOCALES]);
  });

  it("API失敗でも例外を送出せず全localeを失敗として返す", async () => {
    getFieldsTranslatorMock.mockReturnValue({ translateFields: vi.fn().mockRejectedValue(new Error("boom")) });

    const result = await autoTranslateFields({ title: "題" });

    expect(result.failedLocales).toEqual([...TRANSLATED_LOCALES]);
  });
});
