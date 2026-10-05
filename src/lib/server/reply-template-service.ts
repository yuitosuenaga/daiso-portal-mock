import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Inquiry } from "@/types/inquiry";
import type {
  CreateReplyTemplateInput,
  ReplyTemplate,
  ReplyTemplateTranslationView,
} from "@/types/reply-template";

const REPLY_TEMPLATE_INCLUDE = { translations: true } as const;

function mapReplyTemplate(record: {
  id: string;
  category: ReplyTemplate["category"];
  name: string;
  body: string;
  translations?: { locale: string; name: string; body: string }[];
}): ReplyTemplate {
  return {
    id: record.id,
    category: record.category,
    name: record.name,
    body: record.body,
    translations: (record.translations ?? []).map((translation) => ({
      locale: translation.locale,
      name: translation.name,
      body: translation.body,
    })),
  };
}

function toTranslationRows(translations: ReplyTemplateTranslationView[]) {
  return translations.map((translation) => ({
    locale: translation.locale,
    name: translation.name,
    body: translation.body,
  }));
}

/** 全カテゴリ分のテンプレート一覧を取得する。 */
export async function listReplyTemplates(): Promise<ReplyTemplate[]> {
  const records = await prisma.replyTemplate.findMany({
    include: REPLY_TEMPLATE_INCLUDE,
  });

  return records.map(mapReplyTemplate);
}

/** 指定カテゴリのテンプレート一覧を取得する。 */
export async function listReplyTemplatesByCategory(
  category: Inquiry["category"]
): Promise<ReplyTemplate[]> {
  const records = await prisma.replyTemplate.findMany({
    where: { category },
    include: REPLY_TEMPLATE_INCLUDE,
  });

  return records.map(mapReplyTemplate);
}

/** 指定されたIDのテンプレートを1件取得する。存在しない場合はnullを返す。 */
export async function findReplyTemplateById(
  id: string
): Promise<ReplyTemplate | null> {
  const record = await prisma.replyTemplate.findUnique({
    where: { id },
    include: REPLY_TEMPLATE_INCLUDE,
  });

  return record ? mapReplyTemplate(record) : null;
}

/** テンプレートを新規作成する。 */
export async function createReplyTemplateRecord(
  input: CreateReplyTemplateInput
): Promise<ReplyTemplate> {
  const record = await prisma.replyTemplate.create({
    data: {
      category: input.category,
      name: input.name,
      body: input.body,
      translations: { create: toTranslationRows(input.translations ?? []) },
    },
    include: REPLY_TEMPLATE_INCLUDE,
  });

  return mapReplyTemplate(record);
}

/** 既存テンプレートの内容を更新する。 */
export async function updateReplyTemplateRecord(
  id: string,
  input: CreateReplyTemplateInput
): Promise<ReplyTemplate> {
  const record = await prisma.replyTemplate.update({
    where: { id },
    data: {
      category: input.category,
      name: input.name,
      body: input.body,
      // 省略時は既存の翻訳行を維持し、指定時は全置換する
      ...(input.translations
        ? {
            translations: {
              deleteMany: {},
              create: toTranslationRows(input.translations),
            },
          }
        : {}),
    },
    include: REPLY_TEMPLATE_INCLUDE,
  });

  return mapReplyTemplate(record);
}

/** 指定したlocaleの翻訳だけを追加・上書きする（他localeの既存翻訳は維持する）。 */
export async function upsertReplyTemplateTranslations(
  id: string,
  translations: ReplyTemplateTranslationView[]
): Promise<ReplyTemplate> {
  const record = await prisma.replyTemplate.update({
    where: { id },
    data: {
      translations: {
        upsert: translations.map((translation) => ({
          where: { templateId_locale: { templateId: id, locale: translation.locale } },
          create: {
            locale: translation.locale,
            name: translation.name,
            body: translation.body,
          },
          update: { name: translation.name, body: translation.body },
        })),
      },
    },
    include: REPLY_TEMPLATE_INCLUDE,
  });

  return mapReplyTemplate(record);
}
