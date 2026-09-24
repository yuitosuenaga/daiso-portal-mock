import { describe, expect, it, vi } from "vitest";

import { backfillInquiryTranslations } from "./backfill-inquiry-translations";
import type { Translator } from "../src/lib/translation/claude-translator";

function fakePrisma(
  inquiries: {
    id: string;
    title: string;
    originalText: string;
    originalLanguage: string;
    translatedText: string | null;
  }[]
) {
  const findMany = vi.fn().mockResolvedValue(inquiries);
  const update = vi.fn().mockResolvedValue(undefined);
  const upsert = vi.fn().mockResolvedValue(undefined);
  return {
    prisma: {
      inquiry: { findMany, update },
      inquiryTranslation: { upsert },
    },
    findMany,
    update,
    upsert,
  };
}

function fakeTranslator(
  impl: (input: { targetLocale: string }) => Promise<{ title: string; body: string; model: string }>
): Translator {
  return { translate: vi.fn(impl) };
}

describe("backfillInquiryTranslations", () => {
  it("pending/failedの問い合わせのみを対象にする", async () => {
    const { prisma, findMany } = fakePrisma([]);
    await backfillInquiryTranslations(
      prisma as never,
      fakeTranslator(async () => ({ title: "x", body: "x", model: "claude-haiku-4-5" }))
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { translationStatus: { in: ["pending", "failed"] } } })
    );
  });

  it("originalLanguageがjaの問い合わせはenへ翻訳し、completedにする", async () => {
    const { prisma, upsert, update } = fakePrisma([
      {
        id: "inquiry-1",
        title: "件名",
        originalText: "本文",
        originalLanguage: "ja",
        translatedText: null,
      },
    ]);
    const translator = fakeTranslator(async () => ({
      title: "Subject",
      body: "Body",
      model: "claude-haiku-4-5",
    }));

    const result = await backfillInquiryTranslations(prisma as never, translator);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { inquiryId_locale: { inquiryId: "inquiry-1", locale: "en" } },
      })
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: "inquiry-1" },
      data: { translationStatus: "completed" },
    });
    expect(result).toEqual({ completedCount: 1, failedCount: 0 });
  });

  it("既存のtranslatedText（旧ja訳文）があれば本文はそのまま再利用しtitleのみ翻訳する", async () => {
    const { prisma, upsert } = fakePrisma([
      {
        id: "inquiry-1",
        title: "Subject",
        originalText: "Body",
        originalLanguage: "en",
        translatedText: "既存の日本語訳本文",
      },
    ]);
    const translator = fakeTranslator(async () => ({
      title: "件名",
      body: "件名",
      model: "claude-haiku-4-5",
    }));

    await backfillInquiryTranslations(prisma as never, translator);

    const jaUpsertCall = vi
      .mocked(upsert)
      .mock.calls.find(
        (call) => (call[0] as { where: { inquiryId_locale: { locale: string } } }).where
          .inquiryId_locale.locale === "ja"
      );
    expect(jaUpsertCall?.[0]).toMatchObject({
      create: expect.objectContaining({ title: "件名", body: "既存の日本語訳本文" }),
    });
  });

  it("1件でも翻訳ロケールが失敗した場合、failedのままにする", async () => {
    const { prisma, update } = fakePrisma([
      {
        id: "inquiry-1",
        title: "件名",
        originalText: "本文",
        originalLanguage: "ja",
        translatedText: null,
      },
    ]);
    const translator: Translator = {
      translate: vi.fn().mockRejectedValue(new Error("api error")),
    };

    const result = await backfillInquiryTranslations(prisma as never, translator);

    expect(update).toHaveBeenCalledWith({
      where: { id: "inquiry-1" },
      data: { translationStatus: "failed" },
    });
    expect(result).toEqual({ completedCount: 0, failedCount: 1 });
  });
});
