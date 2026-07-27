import { describe, expect, it } from "vitest";

import { DEFAULT_FAQ_LOCALE, mapFaq, resolveFaqContent } from "@/lib/server/faq-mapper";

describe("resolveFaqContent", () => {
  const faq = {
    question: "日本語の質問",
    answer: "日本語の回答",
    translations: [{ locale: "en", question: "English question", answer: "English answer" }],
  };

  it("localeがjaのときFaq.question/answer（親列）を返す", () => {
    expect(resolveFaqContent(faq, "ja")).toEqual({
      question: "日本語の質問",
      answer: "日本語の回答",
    });
  });

  it("DEFAULT_FAQ_LOCALEはjaである", () => {
    expect(DEFAULT_FAQ_LOCALE).toBe("ja");
  });

  it("対応するFaqTranslationが存在する言語ではその内容を返す", () => {
    expect(resolveFaqContent(faq, "en")).toEqual({
      question: "English question",
      answer: "English answer",
    });
  });

  it("対応するFaqTranslationが存在しない言語ではenにフォールバックする", () => {
    expect(resolveFaqContent(faq, "th")).toEqual({
      question: "English question",
      answer: "English answer",
    });
  });

  it("en翻訳も存在しない場合のみjaにフォールバックする", () => {
    const faqWithoutEn = {
      question: "日本語の質問",
      answer: "日本語の回答",
      translations: [],
    };

    expect(resolveFaqContent(faqWithoutEn, "th")).toEqual({
      question: "日本語の質問",
      answer: "日本語の回答",
    });
  });
});

describe("mapFaq", () => {
  it("translationsをFaqTranslationView[]へマッピングする", () => {
    const record = {
      id: "faq-1",
      category: "other" as const,
      question: "質問",
      answer: "回答",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-02T00:00:00.000Z"),
      translations: [
        { id: "t1", faqId: "faq-1", locale: "en", question: "Question", answer: "Answer" },
      ],
    };

    expect(mapFaq(record)).toEqual({
      id: "faq-1",
      category: "other",
      question: "質問",
      answer: "回答",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-02T00:00:00.000Z",
      translations: [{ locale: "en", question: "Question", answer: "Answer" }],
    });
  });

  it("翻訳が0件のときtranslationsは空配列になる", () => {
    const record = {
      id: "faq-2",
      category: "other" as const,
      question: "質問2",
      answer: "回答2",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
      translations: [],
    };

    expect(mapFaq(record).translations).toEqual([]);
  });
});
