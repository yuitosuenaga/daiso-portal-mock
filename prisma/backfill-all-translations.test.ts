import { describe, expect, it, vi } from "vitest";

import { backfillAllTranslations } from "./backfill-all-translations";
import { TRANSLATED_LOCALES } from "../src/lib/constants/locales";
import type { FieldsTranslator, TranslateFieldsInput } from "../src/lib/translation/claude-translator";

function fakeTranslator(): FieldsTranslator {
  return {
    translateFields: vi.fn(async ({ fields, targetLocales }: TranslateFieldsInput) => ({
      translations: Object.fromEntries(
        targetLocales.map((locale) => [
          locale,
          Object.fromEntries(Object.keys(fields).map((key) => [key, `${locale}:${fields[key]}`])),
        ]),
      ),
      model: "claude-haiku-4-5",
    })),
  };
}

function fakePrisma(overrides: Record<string, unknown>) {
  return overrides as never;
}

describe("backfillAllTranslations", () => {
  it("不足localeのみを1回のAPI呼び出しで翻訳しupsertする（既存行は対象外）", async () => {
    const upsert = vi.fn();
    const prisma = fakePrisma({
      faq: {
        findMany: vi.fn().mockResolvedValue([
          { id: "faq-1", question: "質問", answer: "回答", translations: [{ locale: "en" }, { locale: "th" }] },
        ]),
      },
      faqTranslation: { upsert },
    });
    const translator = fakeTranslator();

    const result = await backfillAllTranslations(prisma, translator, { targets: ["faq"] });

    const expectedMissing = TRANSLATED_LOCALES.filter((l) => l !== "en" && l !== "th");
    expect(translator.translateFields).toHaveBeenCalledTimes(1);
    expect(translator.translateFields).toHaveBeenCalledWith({
      fields: { question: "質問", answer: "回答" },
      sourceLocale: "ja",
      targetLocales: expectedMissing,
    });
    expect(upsert).toHaveBeenCalledTimes(expectedMissing.length);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { faqId_locale: { faqId: "faq-1", locale: "pt" } },
        create: { faqId: "faq-1", locale: "pt", question: "pt:質問", answer: "pt:回答" },
        update: {},
      }),
    );
    expect(result.faq).toMatchObject({ translatedItemCount: 1, failedItemCount: 0 });
  });

  it("全localeが揃っている行はスキップする", async () => {
    const prisma = fakePrisma({
      faq: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "faq-1",
            question: "q",
            answer: "a",
            translations: TRANSLATED_LOCALES.map((locale) => ({ locale })),
          },
        ]),
      },
    });
    const translator = fakeTranslator();

    const result = await backfillAllTranslations(prisma, translator, { targets: ["faq"] });

    expect(translator.translateFields).not.toHaveBeenCalled();
    expect(result.faq?.skippedItemCount).toBe(1);
  });

  it("dryRunでは翻訳も書き込みも行わず不足数だけ数える", async () => {
    const upsert = vi.fn();
    const prisma = fakePrisma({
      manual: {
        findMany: vi.fn().mockResolvedValue([
          { id: "m-1", title: "手順", description: null, translations: [] },
        ]),
      },
      manualTranslation: { upsert },
    });
    const translator = fakeTranslator();

    const result = await backfillAllTranslations(prisma, translator, { targets: ["manual"], dryRun: true });

    expect(translator.translateFields).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(result.manual?.missingLocaleCount).toBe(TRANSLATED_LOCALES.length);
  });

  it("問い合わせは原文言語を除くja・enのみを翻訳し、原文言語を元言語に指定する", async () => {
    const upsert = vi.fn();
    const prisma = fakePrisma({
      inquiry: {
        findMany: vi.fn().mockResolvedValue([
          { id: "i-1", title: "Tiêu đề", originalText: "Nội dung", originalLanguage: "vi", translations: [] },
        ]),
      },
      inquiryTranslation: { upsert },
    });
    const translator = fakeTranslator();

    await backfillAllTranslations(prisma, translator, { targets: ["inquiry"] });

    expect(translator.translateFields).toHaveBeenCalledWith({
      fields: { title: "Tiêu đề", body: "Nội dung" },
      sourceLocale: "vi",
      targetLocales: ["ja", "en"],
    });
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it("1件の翻訳が失敗しても処理を継続し失敗件数を返す", async () => {
    const upsert = vi.fn();
    const prisma = fakePrisma({
      documentCategory: {
        findMany: vi.fn().mockResolvedValue([
          { id: "c-1", name: "A", translations: [] },
          { id: "c-2", name: "B", translations: [] },
        ]),
      },
      documentCategoryTranslation: { upsert },
    });
    const translator: FieldsTranslator = {
      translateFields: vi
        .fn()
        .mockRejectedValueOnce(new Error("api error"))
        .mockImplementation(fakeTranslator().translateFields),
    };
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await backfillAllTranslations(prisma, translator, { targets: ["documentCategory"] });

    expect(result.documentCategory).toMatchObject({ failedItemCount: 1, translatedItemCount: 1 });
    expect(upsert).toHaveBeenCalledTimes(TRANSLATED_LOCALES.length);
  });

  it("リンクのtitle/descriptionを全localeへ翻訳し、descriptionが空ならtitleのみ翻訳する", async () => {
    const upsert = vi.fn();
    const prisma = fakePrisma({
      link: {
        findMany: vi.fn().mockResolvedValue([
          { id: "link-1", title: "社内ポータル", description: null, translations: [] },
        ]),
      },
      linkTranslation: { upsert },
    });
    const translator = fakeTranslator();

    const result = await backfillAllTranslations(prisma, translator, { targets: ["link"] });

    expect(translator.translateFields).toHaveBeenCalledWith({
      fields: { title: "社内ポータル" },
      sourceLocale: "ja",
      targetLocales: TRANSLATED_LOCALES,
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { linkId_locale: { linkId: "link-1", locale: "th" } },
        create: { linkId: "link-1", locale: "th", title: "th:社内ポータル", description: null },
        update: {},
      }),
    );
    expect(result.link).toMatchObject({ translatedItemCount: 1, failedItemCount: 0 });
  });

  it("返信テンプレートのname/bodyを不足localeのみ翻訳する", async () => {
    const upsert = vi.fn();
    const prisma = fakePrisma({
      replyTemplate: {
        findMany: vi.fn().mockResolvedValue([
          { id: "tpl-1", name: "受付", body: "受け付けました", translations: [{ locale: "en" }] },
        ]),
      },
      replyTemplateTranslation: { upsert },
    });
    const translator = fakeTranslator();

    const result = await backfillAllTranslations(prisma, translator, { targets: ["replyTemplate"] });

    const expectedMissing = TRANSLATED_LOCALES.filter((l) => l !== "en");
    expect(translator.translateFields).toHaveBeenCalledWith({
      fields: { name: "受付", body: "受け付けました" },
      sourceLocale: "ja",
      targetLocales: expectedMissing,
    });
    expect(upsert).toHaveBeenCalledTimes(expectedMissing.length);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { templateId_locale: { templateId: "tpl-1", locale: "vi" } },
        create: { templateId: "tpl-1", locale: "vi", name: "vi:受付", body: "vi:受け付けました" },
      }),
    );
    expect(result.replyTemplate).toMatchObject({ translatedItemCount: 1, failedItemCount: 0 });
  });
});
