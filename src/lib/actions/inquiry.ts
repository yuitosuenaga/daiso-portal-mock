"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { appendInquiryHistoryEntry } from "@/lib/api/inquiry-history";
import { getInquiryById } from "@/lib/api/inquiries";
import { inquiryAttachmentsArraySchema } from "@/lib/validation/inquiry";
import type { InquiryAttachment } from "@/types/attachment";

const INQUIRY_DETAIL_PATH = "/[locale]/inquiry/[id]";
const HELPDESK_INQUIRY_DETAIL_PATH = "/[locale]/helpdesk/inquiries/[id]";

const inquiryIdSchema = z.string().trim().min(1);
const messageBodySchema = z.string().trim().min(1);

/**
 * 申請者からの追加メッセージ送信内容（添付ファイルを含む）を対応履歴に記録し、
 * 申請者側・ヘルプデスク側の両詳細ルートを再検証する。
 * `actorName`はクライアントから受け取らず、対象問い合わせから解決した会社名を用いる
 * （会社名の偽装を防ぐため）。
 */
export async function sendApplicantMessageAction(
  inquiryId: string,
  body: string,
  attachments: InquiryAttachment[] = []
): Promise<void> {
  const id = inquiryIdSchema.parse(inquiryId);
  const messageBody = messageBodySchema.parse(body);
  const validatedAttachments = inquiryAttachmentsArraySchema.parse(attachments);

  const inquiry = await getInquiryById(id);
  if (!inquiry) {
    throw new Error(`Inquiry not found: ${id}`);
  }

  await appendInquiryHistoryEntry({
    inquiryId: id,
    type: "requester_message",
    actorName: inquiry.submittedBy.companyName,
    occurredAt: new Date().toISOString(),
    detail: messageBody,
    attachments:
      validatedAttachments.length > 0 ? validatedAttachments : undefined,
  });

  revalidatePath(INQUIRY_DETAIL_PATH, "page");
  revalidatePath(HELPDESK_INQUIRY_DETAIL_PATH, "page");
}
