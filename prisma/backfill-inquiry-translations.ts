import { PrismaClient } from "@prisma/client";

import { createClaudeTranslator, type Translator } from "../src/lib/translation/claude-translator";
import { routing } from "../src/i18n/routing";

type BackfillPrismaClient = Pick<PrismaClient, "inquiry" | "inquiryTranslation">;

/**
 * 翻訳未実行・失敗（`translationStatus`が`pending`または`failed`）の問い合わせに対し、
 * Claude APIで`originalLanguage`以外の全ロケールへ翻訳し、`InquiryTranslation`へ保存する。
 * 既存の（非推奨）`translatedText`があればja行のbodyとして再利用し、titleのみ翻訳する。
 *
 * 問い合わせは正式な発信文書ではないため、お知らせと異なり人によるレビューを経ず直接投入する。
 * 1件の翻訳に失敗しても処理は継続し、`translationStatus`を`failed`のまま残す。
 */
export async function backfillInquiryTranslations(
  prisma: BackfillPrismaClient,
  translator: Translator
): Promise<{ completedCount: number; failedCount: number }> {
  const targets = await prisma.inquiry.findMany({
    where: { translationStatus: { in: ["pending", "failed"] } },
    select: { id: true, title: true, originalText: true, originalLanguage: true, translatedText: true },
  });

  let completedCount = 0;
  let failedCount = 0;

  for (const inquiry of targets) {
    const targetLocales = routing.locales.filter((locale) => locale !== inquiry.originalLanguage);
    if (targetLocales.length === 0) {
      await prisma.inquiry.update({ where: { id: inquiry.id }, data: { translationStatus: "completed" } });
      completedCount += 1;
      continue;
    }

    let hasFailure = false;
    for (const locale of targetLocales) {
      try {
        if (locale === "ja" && inquiry.translatedText) {
          // 既存の（非推奨）ja訳文本文を再利用し、titleのみ翻訳する。
          const translatedTitle = await translator.translate({
            title: inquiry.title,
            body: inquiry.title || " ",
            sourceLocale: inquiry.originalLanguage,
            targetLocale: locale,
          });
          await prisma.inquiryTranslation.upsert({
            where: { inquiryId_locale: { inquiryId: inquiry.id, locale } },
            create: {
              inquiryId: inquiry.id,
              locale,
              title: translatedTitle.title,
              body: inquiry.translatedText,
              source: "machine",
              model: translatedTitle.model,
            },
            update: {},
          });
          continue;
        }

        const translated = await translator.translate({
          title: inquiry.title,
          body: inquiry.originalText,
          sourceLocale: inquiry.originalLanguage,
          targetLocale: locale,
        });
        await prisma.inquiryTranslation.upsert({
          where: { inquiryId_locale: { inquiryId: inquiry.id, locale } },
          create: {
            inquiryId: inquiry.id,
            locale,
            title: translated.title,
            body: translated.body,
            source: "machine",
            model: translated.model,
          },
          update: {},
        });
      } catch (error) {
        console.error(`[backfill] failed to translate inquiry ${inquiry.id} -> ${locale}:`, error);
        hasFailure = true;
      }
    }

    await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: { translationStatus: hasFailure ? "failed" : "completed" },
    });
    if (hasFailure) {
      failedCount += 1;
    } else {
      completedCount += 1;
    }
  }

  return { completedCount, failedCount };
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const translator = createClaudeTranslator();

  try {
    const result = await backfillInquiryTranslations(prisma, translator);
    console.log("Backfill complete:", result);
  } finally {
    await prisma.$disconnect();
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
