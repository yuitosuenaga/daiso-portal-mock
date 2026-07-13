"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { appendInquiryHistoryEntry } from "@/lib/api/inquiry-history";
import {
  getInquiryById,
  setInquiryClaim,
  updateInquiryStatus,
} from "@/lib/api/inquiries";
import {
  createReplyTemplate,
  updateReplyTemplate,
} from "@/lib/api/reply-templates";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import { INQUIRY_STATUS_CODES } from "@/lib/constants/inquiry-options";
import { replyTemplateFormSchema } from "@/lib/validation/reply-template";
import { inquiryAttachmentsArraySchema } from "@/lib/validation/inquiry";
import type { Inquiry } from "@/types/inquiry";
import type { InquiryAttachment } from "@/types/attachment";
import type {
  CreateReplyTemplateInput,
  ReplyTemplate,
} from "@/types/reply-template";

const INQUIRY_LIST_PATH = "/[locale]/helpdesk/inquiries";
const INQUIRY_DETAIL_PATH = "/[locale]/helpdesk/inquiries/[id]";
const TEMPLATE_LIST_PATH = "/[locale]/helpdesk/templates";

const inquiryIdSchema = z.string().trim().min(1);
const statusSchema = z.enum(INQUIRY_STATUS_CODES);
const replyBodySchema = z.string().trim().min(1);

function revalidateInquiryRoutes() {
  revalidatePath(INQUIRY_LIST_PATH, "page");
  revalidatePath(INQUIRY_DETAIL_PATH, "page");
}

/**
 * 対応中フラグをONにし、対応履歴に記録したうえで一覧・詳細ルートを再検証する。
 */
export async function claimInquiryAction(inquiryId: string): Promise<void> {
  const id = inquiryIdSchema.parse(inquiryId);
  const { claims } = await requireHelpdeskStaffSession();

  await setInquiryClaim(id, claims.displayName);
  await appendInquiryHistoryEntry({
    inquiryId: id,
    type: "claimed",
    actorName: claims.displayName,
    occurredAt: new Date().toISOString(),
  });
  revalidateInquiryRoutes();
}

/**
 * 対応中フラグを解除し、対応履歴に記録したうえで一覧・詳細ルートを再検証する。
 */
export async function releaseInquiryClaimAction(
  inquiryId: string
): Promise<void> {
  const id = inquiryIdSchema.parse(inquiryId);
  const { claims } = await requireHelpdeskStaffSession();

  await setInquiryClaim(id, null);
  await appendInquiryHistoryEntry({
    inquiryId: id,
    type: "released",
    actorName: claims.displayName,
    occurredAt: new Date().toISOString(),
  });
  revalidateInquiryRoutes();
}

/**
 * 対応状況を変更し、変更前後の値を対応履歴に記録したうえで一覧・詳細ルートを再検証する。
 * 変更後の`status`は申請者側が参照する同一データにも反映される。
 */
export async function changeInquiryStatusAction(
  inquiryId: string,
  status: Inquiry["status"]
): Promise<void> {
  const id = inquiryIdSchema.parse(inquiryId);
  const validatedStatus = statusSchema.parse(status);
  const { claims } = await requireHelpdeskStaffSession();

  const previous = await getInquiryById(id);
  const previousStatus = previous?.status;

  await updateInquiryStatus(id, validatedStatus);

  const t = await getTranslations("inquiryList.status");
  const detail = previousStatus
    ? `${t(previousStatus)} → ${t(validatedStatus)}`
    : t(validatedStatus);

  await appendInquiryHistoryEntry({
    inquiryId: id,
    type: "status_changed",
    actorName: claims.displayName,
    occurredAt: new Date().toISOString(),
    detail,
  });
  revalidateInquiryRoutes();
}

/**
 * 返信送信内容（添付ファイルを含む）を対応履歴に記録し、詳細ルートを再検証する。
 * 添付ファイルは`inquiry-form`spec所有の`inquiryAttachmentsArraySchema`（件数上限・サイズ・形式を検証）でサーバー側検証する。
 */
export async function sendInquiryReplyAction(
  inquiryId: string,
  replyBody: string,
  attachments: InquiryAttachment[] = []
): Promise<void> {
  const id = inquiryIdSchema.parse(inquiryId);
  const body = replyBodySchema.parse(replyBody);
  const validatedAttachments = inquiryAttachmentsArraySchema.parse(attachments);
  const { claims } = await requireHelpdeskStaffSession();

  await appendInquiryHistoryEntry({
    inquiryId: id,
    type: "reply_sent",
    actorName: claims.displayName,
    occurredAt: new Date().toISOString(),
    detail: body,
    attachments:
      validatedAttachments.length > 0 ? validatedAttachments : undefined,
  });
  revalidatePath(INQUIRY_DETAIL_PATH, "page");
}

/**
 * テンプレートを新規作成し、テンプレート一覧・問い合わせ詳細ルートを再検証する。
 * 不正な入力（カテゴリ・本文の未入力）は保存せず例外を送出する。
 */
export async function createReplyTemplateAction(
  input: CreateReplyTemplateInput
): Promise<ReplyTemplate> {
  const parsed = replyTemplateFormSchema.parse(input);
  const created = await createReplyTemplate(parsed);
  revalidatePath(TEMPLATE_LIST_PATH, "page");
  revalidatePath(INQUIRY_DETAIL_PATH, "page");

  return created;
}

/**
 * 既存テンプレートの内容を更新し、テンプレート一覧・問い合わせ詳細ルートを再検証する。
 * 不正な入力（カテゴリ・本文の未入力）は保存せず例外を送出する。
 */
export async function updateReplyTemplateAction(
  id: string,
  input: CreateReplyTemplateInput
): Promise<ReplyTemplate> {
  const parsed = replyTemplateFormSchema.parse(input);
  const updated = await updateReplyTemplate(id, parsed);
  revalidatePath(TEMPLATE_LIST_PATH, "page");
  revalidatePath(INQUIRY_DETAIL_PATH, "page");

  return updated;
}
