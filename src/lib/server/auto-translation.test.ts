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

  it("空でないフィールドだけを全対応言語へ1回で翻訳する", async () => {
    const translateFields = vi.fn(async ({ targetLocales }: { targetLocales: string[] }) => ({
      translations: Object.fromEntries(targetLocales.map((l) => [l, { title: `${l}:題` }])),
      model: "m",
    }));
    getFieldsTranslatorMock.mockReturnValue({ translateFields });

    const result = await autoTranslateFields({ title: "題", description: " ", note: null });

    expect(translateFields).toHaveBeenCalledTimes(1);
    expect(translateFields).toHaveBeenCalledWith({
      fields: { title: "題" },
      sourceLocale: "ja",
      targetLocales: TRANSLATED_LOCALES,
    });
    expect(result.failedLocales).toEqual([]);
    expect(result.translations.th).toEqual({ title: "th:題" });
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
