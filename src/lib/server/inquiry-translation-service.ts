import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getTranslator } from "@/lib/server/translation-service";
import { routing } from "@/i18n/routing";
import type { Translator } from "@/lib/translation/claude-translator";

function resolveTargetLocales(originalLanguage: string): string[] {
  return routing.locales.filter((locale) => locale !== originalLanguage);
}

/**
 * 問い合わせを`originalLanguage`以外の全ロケールへ自動翻訳し、`InquiryTranslation`へ
 * 保存する。保存後、対象問い合わせの`translationStatus`を更新する
 * （全ロケール成功=completed、1件以上失敗=failed、翻訳対象なし/未設定=pending）。
 *
 * 例外は投げない（呼び出し元の問い合わせ送信処理を翻訳の成否で失敗させないため）。
 * 失敗はログにのみ出力し、`translationStatus: "failed"`で表現する。
 */
export async function translateInquiryAndStore(
  inquiryId: string,
  translator: Translator | null = getTranslator()
): Promise<void> {
  try {
    const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
    if (!inquiry) {
      return;
    }

    const targetLocales = resolveTargetLocales(inquiry.originalLanguage);
    if (targetLocales.length === 0) {
      await prisma.inquiry.update({
        where: { id: inquiryId },
        data: { translationStatus: "completed" },
      });
      return;
    }

    if (!translator) {
      return;
    }

    const results = await Promise.allSettled(
      targetLocales.map(async (locale) => {
        const translated = await translator.translate({
          title: inquiry.title,
          body: inquiry.originalText,
          sourceLocale: inquiry.originalLanguage,
          targetLocale: locale,
        });
        await prisma.inquiryTranslation.upsert({
          where: { inquiryId_locale: { inquiryId, locale } },
          create: {
            inquiryId,
            locale,
            title: translated.title,
            body: translated.body,
            source: "machine",
            model: translated.model,
          },
          update: {
            title: translated.title,
            body: translated.body,
            source: "machine",
            model: translated.model,
          },
        });
      })
    );

    const hasFailure = results.some((result) => result.status === "rejected");
    for (const result of results) {
      if (result.status === "rejected") {
        console.error(
          `[inquiry-translation] failed to translate inquiry ${inquiryId}:`,
          result.reason
        );
      }
    }

    await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { translationStatus: hasFailure ? "failed" : "completed" },
    });
  } catch (error) {
    console.error(`[inquiry-translation] unexpected error for inquiry ${inquiryId}:`, error);
  }
}
