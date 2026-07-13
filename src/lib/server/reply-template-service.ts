import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Inquiry } from "@/types/inquiry";
import type {
  CreateReplyTemplateInput,
  ReplyTemplate,
} from "@/types/reply-template";

function mapReplyTemplate(record: {
  id: string;
  category: ReplyTemplate["category"];
  name: string;
  body: string;
}): ReplyTemplate {
  return {
    id: record.id,
    category: record.category,
    name: record.name,
    body: record.body,
  };
}

/** 全カテゴリ分のテンプレート一覧を取得する。 */
export async function listReplyTemplates(): Promise<ReplyTemplate[]> {
  const records = await prisma.replyTemplate.findMany();

  return records.map(mapReplyTemplate);
}

/** 指定カテゴリのテンプレート一覧を取得する。 */
export async function listReplyTemplatesByCategory(
  category: Inquiry["category"]
): Promise<ReplyTemplate[]> {
  const records = await prisma.replyTemplate.findMany({ where: { category } });

  return records.map(mapReplyTemplate);
}

/** 指定されたIDのテンプレートを1件取得する。存在しない場合はnullを返す。 */
export async function findReplyTemplateById(
  id: string
): Promise<ReplyTemplate | null> {
  const record = await prisma.replyTemplate.findUnique({ where: { id } });

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
    },
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
    },
  });

  return mapReplyTemplate(record);
}
