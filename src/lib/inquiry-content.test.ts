import { describe, expect, it } from "vitest";

import { resolveInquiryContent } from "@/lib/inquiry-content";

describe("resolveInquiryContent", () => {
  it("originalLanguageとlocaleが一致する場合は原文を返す", () => {
    const result = resolveInquiryContent(
      {
        title: "件名",
        originalText: "本文",
        originalLanguage: "ja",
        translations: [{ locale: "en", title: "Subject", body: "Body", source: "machine" }],
      },
      "ja"
    );

    expect(result).toEqual({ title: "件名", body: "本文", isTranslated: false });
  });

  it("localeに一致する翻訳があればそれを返す", () => {
    const result = resolveInquiryContent(
      {
        title: "件名",
        originalText: "本文",
        originalLanguage: "ja",
        translations: [{ locale: "en", title: "Subject", body: "Body", source: "machine" }],
      },
      "en"
    );

    expect(result).toEqual({ title: "Subject", body: "Body", isTranslated: true });
  });

  it("localeに一致する翻訳がなく旧translatedText（ja）がある場合はそれを本文として使う", () => {
    const result = resolveInquiryContent(
      {
        title: "Subject",
        originalText: "Body",
        originalLanguage: "en",
        translations: [],
        translatedText: "本文（日本語訳）",
      },
      "ja"
    );

    expect(result).toEqual({
      title: "Subject",
      body: "本文（日本語訳）",
      isTranslated: true,
    });
  });

  it("翻訳が一切ない場合は原文にフォールバックする", () => {
    const result = resolveInquiryContent(
      {
        title: "Subject",
        originalText: "Body",
        originalLanguage: "en",
        translations: [],
      },
      "ja"
    );

    expect(result).toEqual({ title: "Subject", body: "Body", isTranslated: false });
  });

  it("旧translatedTextはja以外のlocaleには使わない", () => {
    const result = resolveInquiryContent(
      {
        title: "Subject",
        originalText: "Body",
        originalLanguage: "en",
        translations: [],
        translatedText: "本文（日本語訳）",
      },
      "th"
    );

    expect(result).toEqual({ title: "Subject", body: "Body", isTranslated: false });
  });
});
