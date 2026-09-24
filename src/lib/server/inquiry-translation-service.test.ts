import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    inquiry: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    inquiryTranslation: {
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { translateInquiryAndStore } from "@/lib/server/inquiry-translation-service";
import type { Translator } from "@/lib/translation/claude-translator";

const baseInquiry = {
  id: "inquiry-1",
  title: "件名",
  originalText: "本文",
  originalLanguage: "ja",
};

beforeEach(() => {
  vi.clearAllMocks();
});

function fakeTranslator(
  impl: (input: { targetLocale: string }) => Promise<{ title: string; body: string; model: string }>
): Translator {
  return { translate: vi.fn(impl) };
}

describe("translateInquiryAndStore", () => {
  it("originalLanguageがjaの場合、enへ翻訳して保存し、completedにする", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue(baseInquiry as never);
    const translator = fakeTranslator(async ({ targetLocale }) => ({
      title: `[${targetLocale}] Subject`,
      body: `[${targetLocale}] Body`,
      model: "claude-haiku-4-5",
    }));

    await translateInquiryAndStore("inquiry-1", translator);

    expect(prisma.inquiryTranslation.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.inquiryTranslation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { inquiryId_locale: { inquiryId: "inquiry-1", locale: "en" } },
        create: expect.objectContaining({
          locale: "en",
          title: "[en] Subject",
          body: "[en] Body",
          source: "machine",
        }),
      })
    );
    expect(prisma.inquiry.update).toHaveBeenCalledWith({
      where: { id: "inquiry-1" },
      data: { translationStatus: "completed" },
    });
  });

  it("originalLanguageがthの場合、jaとenの両方へ翻訳する", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue({
      ...baseInquiry,
      originalLanguage: "th",
    } as never);
    const translator = fakeTranslator(async ({ targetLocale }) => ({
      title: `[${targetLocale}]`,
      body: `[${targetLocale}]`,
      model: "claude-haiku-4-5",
    }));

    await translateInquiryAndStore("inquiry-1", translator);

    const localesCalled = vi
      .mocked(prisma.inquiryTranslation.upsert)
      .mock.calls.map(
        (call) =>
          (call[0] as { where: { inquiryId_locale: { locale: string } } }).where
            .inquiryId_locale.locale
      )
      .sort();
    expect(localesCalled).toEqual(["en", "ja"]);
  });

  it("1件でも翻訳に失敗した場合、failedにする", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue(baseInquiry as never);
    const translator: Translator = {
      translate: vi.fn().mockRejectedValue(new Error("api error")),
    };

    await translateInquiryAndStore("inquiry-1", translator);

    expect(prisma.inquiry.update).toHaveBeenCalledWith({
      where: { id: "inquiry-1" },
      data: { translationStatus: "failed" },
    });
  });

  it("translatorがnull（未設定）の場合、何もせずpendingのまま返す", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue(baseInquiry as never);

    await translateInquiryAndStore("inquiry-1", null);

    expect(prisma.inquiryTranslation.upsert).not.toHaveBeenCalled();
    expect(prisma.inquiry.update).not.toHaveBeenCalled();
  });

  it("対象の問い合わせが存在しない場合、何もしない", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValue(null);
    const translator = fakeTranslator(async () => ({
      title: "x",
      body: "x",
      model: "claude-haiku-4-5",
    }));

    await translateInquiryAndStore("missing", translator);

    expect(prisma.inquiryTranslation.upsert).not.toHaveBeenCalled();
    expect(prisma.inquiry.update).not.toHaveBeenCalled();
  });

  it("予期しないDBエラーが起きても例外を外に投げない（呼び出し元の送信処理を止めない）", async () => {
    vi.mocked(prisma.inquiry.findUnique).mockRejectedValue(new Error("db down"));

    await expect(translateInquiryAndStore("inquiry-1", null)).resolves.toBeUndefined();
  });
});
