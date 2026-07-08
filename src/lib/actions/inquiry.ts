"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createInquiry } from "@/lib/api/inquiries";
import { requireApplicantSession } from "@/lib/server/auth-session";
import {
  appendHistoryEntry,
  findInquiryForCompany,
} from "@/lib/server/inquiry-service";
import { inquiryAttachmentsArraySchema } from "@/lib/validation/inquiry";
import type { InquiryAttachment } from "@/types/attachment";
import type { CreateInquiryInput, Inquiry } from "@/types/inquiry";

const INQUIRY_DETAIL_PATH = "/[locale]/inquiry/[id]";
const HELPDESK_INQUIRY_DETAIL_PATH = "/[locale]/helpdesk/inquiries/[id]";

const inquiryIdSchema = z.string().trim().min(1);
const messageBodySchema = z.string().trim().min(1);

/**
 * 問い合わせ・申請フォームの送信を行う。`InquiryForm`（Client Component）から
 * 呼び出すためのServer Action。Prisma（サーバー専用）を安全にクライアントバンドルから
 * 除外するため、`lib/api/inquiries.ts`への直接importの代わりにこの関数を経由する。
 */
export async function createInquiryAction(
  input: CreateInquiryInput
): Promise<Inquiry> {
  return createInquiry(input);
}

/**
 * 申請者からの追加メッセージ送信内容（添付ファイルを含む）を対応履歴に記録し、
 * 申請者側・ヘルプデスク側の両詳細ルートを再検証する。
 * `actorName`はクライアントから受け取らず、対象問い合わせから解決した会社名を用いる
 * （会社名の偽装を防ぐため）。ログイン中セッションの会社が対象問い合わせの所有会社と
 * 一致しない場合は例外を送出する（他社の問い合わせへのメッセージ送信を防ぐため）。
 */
export async function sendApplicantMessageAction(
  inquiryId: string,
  body: string,
  attachments: InquiryAttachment[] = []
): Promise<void> {
  const id = inquiryIdSchema.parse(inquiryId);
  const messageBody = messageBodySchema.parse(body);
  const validatedAttachments = inquiryAttachmentsArraySchema.parse(attachments);

  const { claims } = await requireApplicantSession();

  const inquiry = await findInquiryForCompany(id, claims.companyId);
  if (!inquiry) {
    throw new Error(`Inquiry not found: ${id}`);
  }

  await appendHistoryEntry({
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
