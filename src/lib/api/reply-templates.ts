import type {
  CreateReplyTemplateInput,
  ReplyTemplate,
} from "@/types/reply-template";
import type { Inquiry } from "@/types/inquiry";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import {
  createReplyTemplateRecord,
  findReplyTemplateById,
  listReplyTemplates,
  listReplyTemplatesByCategory,
  updateReplyTemplateRecord,
} from "@/lib/server/reply-template-service";

/**
 * 全カテゴリ分のテンプレート一覧を取得する。
 */
export async function getReplyTemplates(): Promise<ReplyTemplate[]> {
  await requireHelpdeskStaffSession();

  return listReplyTemplates();
}

/**
 * 指定カテゴリのテンプレート一覧を取得する。
 */
export async function getReplyTemplatesByCategory(
  category: Inquiry["category"]
): Promise<ReplyTemplate[]> {
  await requireHelpdeskStaffSession();

  return listReplyTemplatesByCategory(category);
}

/**
 * 指定されたIDのテンプレートを1件取得する。
 * 該当データが存在しない場合は例外をthrowせず `null` を解決する。
 */
export async function getReplyTemplateById(
  id: string
): Promise<ReplyTemplate | null> {
  await requireHelpdeskStaffSession();

  return findReplyTemplateById(id);
}

/**
 * テンプレートを新規作成する。
 */
export async function createReplyTemplate(
  input: CreateReplyTemplateInput
): Promise<ReplyTemplate> {
  await requireHelpdeskStaffSession();

  return createReplyTemplateRecord(input);
}

/**
 * 既存テンプレートの内容を更新する。
 */
export async function updateReplyTemplate(
  id: string,
  input: CreateReplyTemplateInput
): Promise<ReplyTemplate> {
  await requireHelpdeskStaffSession();

  return updateReplyTemplateRecord(id, input);
}
