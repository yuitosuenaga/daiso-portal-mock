import { createHash } from "crypto";

import { PrismaClient } from "@prisma/client";

import { TRANSLATED_LOCALES } from "../src/lib/constants/locales";
import { createClaudeTranslator, type FieldsTranslator } from "../src/lib/translation/claude-translator";

/**
 * 全対応言語（`TRANSLATED_LOCALES`）の翻訳を、既存の翻訳テーブルへ一括で補う。
 *
 * 冪等: 既に存在する(親ID, locale)の行（manual含む）には一切触れず、不足localeのみを翻訳して追加する。
 * 1件の翻訳に失敗しても処理は継続し、失敗件数を返す。再実行すると失敗分だけが再試行される。
 * 問い合わせは原文言語・ja・enのみを対象とする（本文は全言語化しない方針）。
 */

export const BACKFILL_TARGETS = [
  "announcement",
  "document",
  "documentCategory",
  "faq",
  "manual",
  "linkCategory",
  "inquiry",
] as const;
export type BackfillTarget = (typeof BACKFILL_TARGETS)[number];

type Fields = Record<string, string>;

interface Item {
  id: string;
  /** 原文（非空のフィールドのみ） */
  fields: Fields;
  /** 既に翻訳行が存在するlocale */
  existingLocales: string[];
  /** 翻訳対象とするlocale。省略時は`TRANSLATED_LOCALES`全て */
  locales?: readonly string[];
  sourceLocale?: string;
}

interface TargetDefinition {
  load(prisma: PrismaClient, limit?: number): Promise<Item[]>;
  save(prisma: PrismaClient, item: Item, locale: string, values: Fields, model: string): Promise<void>;
}

function compact(fields: Record<string, string | null | undefined>): Fields {
  return Object.fromEntries(
    Object.entries(fields).filter((entry): entry is [string, string] => Boolean(entry[1]?.trim())),
  );
}

function hashContent(title: string, body: string): string {
  return createHash("sha256").update(`${title}\u0000${body}`).digest("hex");
}

const DEFINITIONS: Record<BackfillTarget, TargetDefinition> = {
  announcement: {
    async load(prisma, limit) {
      const rows = await prisma.announcement.findMany({
        select: { id: true, title: true, body: true, translations: { select: { locale: true } } },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        fields: compact({ title: row.title, body: row.body }),
        existingLocales: row.translations.map((t) => t.locale),
      }));
    },
    async save(prisma, item, locale, values) {
      await prisma.announcementTranslation.upsert({
        where: { announcementId_locale: { announcementId: item.id, locale } },
        create: {
          announcementId: item.id,
          locale,
          title: values.title ?? "",
          body: values.body ?? "",
          source: "machine",
          sourceHash: hashContent(item.fields.title ?? "", item.fields.body ?? ""),
        },
        update: {},
      });
    },
  },
  document: {
    async load(prisma, limit) {
      const rows = await prisma.document.findMany({
        select: { id: true, title: true, description: true, translations: { select: { locale: true } } },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        fields: compact({ title: row.title, description: row.description }),
        existingLocales: row.translations.map((t) => t.locale),
      }));
    },
    async save(prisma, item, locale, values) {
      await prisma.documentTranslation.upsert({
        where: { documentId_locale: { documentId: item.id, locale } },
        create: { documentId: item.id, locale, title: values.title ?? "", description: values.description ?? null },
        update: {},
      });
    },
  },
  documentCategory: {
    async load(prisma, limit) {
      const rows = await prisma.documentCategory.findMany({
        select: { id: true, name: true, translations: { select: { locale: true } } },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        fields: compact({ name: row.name }),
        existingLocales: row.translations.map((t) => t.locale),
      }));
    },
    async save(prisma, item, locale, values) {
      await prisma.documentCategoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: item.id, locale } },
        create: { categoryId: item.id, locale, name: values.name ?? "" },
        update: {},
      });
    },
  },
  faq: {
    async load(prisma, limit) {
      const rows = await prisma.faq.findMany({
        select: { id: true, question: true, answer: true, translations: { select: { locale: true } } },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        fields: compact({ question: row.question, answer: row.answer }),
        existingLocales: row.translations.map((t) => t.locale),
      }));
    },
    async save(prisma, item, locale, values) {
      await prisma.faqTranslation.upsert({
        where: { faqId_locale: { faqId: item.id, locale } },
        create: { faqId: item.id, locale, question: values.question ?? "", answer: values.answer ?? "" },
        update: {},
      });
    },
  },
  manual: {
    async load(prisma, limit) {
      const rows = await prisma.manual.findMany({
        select: { id: true, title: true, description: true, translations: { select: { locale: true } } },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        fields: compact({ title: row.title, description: row.description }),
        existingLocales: row.translations.map((t) => t.locale),
      }));
    },
    async save(prisma, item, locale, values) {
      await prisma.manualTranslation.upsert({
        where: { manualId_locale: { manualId: item.id, locale } },
        create: { manualId: item.id, locale, title: values.title ?? "", description: values.description ?? null },
        update: {},
      });
    },
  },
  linkCategory: {
    async load(prisma, limit) {
      const rows = await prisma.linkCategory.findMany({
        select: { id: true, name: true, translations: { select: { locale: true } } },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        fields: compact({ name: row.name }),
        existingLocales: row.translations.map((t) => t.locale),
      }));
    },
    async save(prisma, item, locale, values) {
      await prisma.linkCategoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: item.id, locale } },
        create: { categoryId: item.id, locale, name: values.name ?? "" },
        update: {},
      });
    },
  },
  inquiry: {
    async load(prisma, limit) {
      const rows = await prisma.inquiry.findMany({
        select: {
          id: true,
          title: true,
          originalText: true,
          originalLanguage: true,
          translations: { select: { locale: true } },
        },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        fields: compact({ title: row.title, body: row.originalText }),
        sourceLocale: row.originalLanguage,
        // 原文言語自身は翻訳不要。ja・en・原文言語（送信者言語）のみ保持する
        locales: ["ja", "en"].filter((locale) => locale !== row.originalLanguage),
        existingLocales: row.translations.map((t) => t.locale),
      }));
    },
    async save(prisma, item, locale, values, model) {
      await prisma.inquiryTranslation.upsert({
        where: { inquiryId_locale: { inquiryId: item.id, locale } },
        create: {
          inquiryId: item.id,
          locale,
          title: values.title ?? "",
          body: values.body ?? "",
          source: "machine",
          model,
        },
        update: {},
      });
    },
  },
};

export interface BackfillOptions {
  targets?: readonly BackfillTarget[];
  limit?: number;
  dryRun?: boolean;
}

export interface BackfillSummary {
  /** 不足locale数の合計（dryRunでは翻訳予定数） */
  missingLocaleCount: number;
  translatedItemCount: number;
  skippedItemCount: number;
  failedItemCount: number;
}

export async function backfillAllTranslations(
  prisma: PrismaClient,
  translator: FieldsTranslator,
  options: BackfillOptions = {},
): Promise<Record<string, BackfillSummary>> {
  const results: Record<string, BackfillSummary> = {};

  for (const target of options.targets ?? BACKFILL_TARGETS) {
    const definition = DEFINITIONS[target];
    const summary: BackfillSummary = {
      missingLocaleCount: 0,
      translatedItemCount: 0,
      skippedItemCount: 0,
      failedItemCount: 0,
    };
    results[target] = summary;

    const items = await definition.load(prisma, options.limit);
    for (const item of items) {
      const candidates = item.locales ?? TRANSLATED_LOCALES;
      const missing = candidates.filter((locale) => !item.existingLocales.includes(locale));
      if (missing.length === 0 || Object.keys(item.fields).length === 0) {
        summary.skippedItemCount += 1;
        continue;
      }
      summary.missingLocaleCount += missing.length;
      if (options.dryRun) continue;

      try {
        const { translations, model } = await translator.translateFields({
          fields: item.fields,
          sourceLocale: item.sourceLocale ?? "ja",
          targetLocales: missing,
        });
        for (const locale of missing) {
          await definition.save(prisma, item, locale, translations[locale] ?? {}, model);
        }
        summary.translatedItemCount += 1;
      } catch (error) {
        console.error(`[backfill] failed to translate ${target} ${item.id}:`, error);
        summary.failedItemCount += 1;
      }
    }
  }

  return results;
}

function parseArgs(argv: string[]): BackfillOptions {
  const options: BackfillOptions = {};
  for (const arg of argv) {
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg.startsWith("--table=")) {
      const names = arg.slice("--table=".length).split(",") as BackfillTarget[];
      const unknown = names.filter((name) => !BACKFILL_TARGETS.includes(name));
      if (unknown.length > 0) throw new Error(`Unknown table: ${unknown.join(", ")}`);
      options.targets = names;
    } else if (arg.startsWith("--limit=")) options.limit = Number(arg.slice("--limit=".length));
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  const translator = createClaudeTranslator();

  try {
    const result = await backfillAllTranslations(prisma, translator, options);
    console.log(options.dryRun ? "Dry run (no writes):" : "Backfill complete:", result);
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
