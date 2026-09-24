import { PrismaClient } from "@prisma/client";

import { createClaudeTranslator, type Translator } from "../src/lib/translation/claude-translator";

type BackfillPrismaClient = Pick<PrismaClient, "announcement" | "announcementTranslation">;

/**
 * en翻訳（`AnnouncementTranslation`のlocale="en"行）が存在しないお知らせに対し、
 * Claude APIでja本文を翻訳しen行を補う（機能追加前に作成された既存お知らせ向け）。
 *
 * 冪等: en行が既にある（en必須化ルール導入後に作成・編集済み等）お知らせはスキップする。
 * 1件の翻訳に失敗しても処理は継続し、失敗件数をログに出力する。
 *
 * Prisma・Translatorを引数で受け取ることで、実DB・実APIを使わないテストからも検証できる。
 */
export async function backfillAnnouncementEnTranslations(
  prisma: BackfillPrismaClient,
  translator: Translator
): Promise<{ translatedCount: number; skippedCount: number; failedCount: number }> {
  const targets = await prisma.announcement.findMany({
    where: { translations: { none: { locale: "en" } } },
    select: { id: true, title: true, body: true },
  });

  let translatedCount = 0;
  let failedCount = 0;

  for (const announcement of targets) {
    try {
      const translated = await translator.translate({
        title: announcement.title,
        body: announcement.body,
        sourceLocale: "ja",
        targetLocale: "en",
      });

      await prisma.announcementTranslation.upsert({
        where: { announcementId_locale: { announcementId: announcement.id, locale: "en" } },
        create: {
          announcementId: announcement.id,
          locale: "en",
          title: translated.title,
          body: translated.body,
          source: "machine",
        },
        update: {},
      });
      translatedCount += 1;
    } catch (error) {
      console.error(`[backfill] failed to translate announcement ${announcement.id}:`, error);
      failedCount += 1;
    }
  }

  return { translatedCount, skippedCount: 0, failedCount };
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const translator = createClaudeTranslator();

  try {
    const result = await backfillAnnouncementEnTranslations(prisma, translator);
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
