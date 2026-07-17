"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createInquiry, markInquiryRead } from "@/lib/api/inquiries";
import { requireApplicantSession } from "@/lib/server/auth-session";
import {
  appendHistoryEntry,
  findInquiryForCompany,
} from "@/lib/server/inquiry-service";
import { inquiryAttachmentsArraySchema } from "@/lib/validation/inquiry";
import type { InquiryAttachment } from "@/types/attachment";
import type { CreateInquiryInput, Inquiry } from "@/types/inquiry";

const INQUIRY_LIST_PATH = "/[locale]/inquiry";
const INQUIRY_DETAIL_PATH = "/[locale]/inquiry/[id]";
const HELPDESK_INQUIRY_DETAIL_PATH = "/[locale]/helpdesk/inquiries/[id]";

const inquiryIdSchema = z.string().trim().min(1);
const messageBodySchema = z.string().trim().min(1);

/**
 * 問い合わせ・申請フォームの送信を行う。`InquiryForm`（Client Component）から
 * 呼び出すためのServer Action。Prisma（サーバー専用）を安全にクライアントバンドルから
 * 除外するため、`lib/api/inquiries.ts`への直接importの代わりにこの関数を経由する。
 *
 * `proxyCompanyId`はヘルプデスクの代理登録時のみ渡される（`inquiry-form`spec 要件12）。
 */
export async function createInquiryAction(
  input: CreateInquiryInput,
  proxyCompanyId?: string
): Promise<Inquiry> {
  return createInquiry(input, proxyCompanyId);
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

/**
 * 申請者が問い合わせ詳細画面（`/inquiry/[id]`）を開いた時点で、その問い合わせを
 * 既読として記録する（`lastReadAt`を現在時刻に更新する）。既読の記録は`status`・
 * 対応中フラグ（`claim`）を一切変更しない。既読記録後、申請一覧の新着インジケーターが
 * 更新されるよう一覧ルートを再検証する。
 *
 * `MarkInquiryRead`（Client Component）から詳細画面マウント時に呼び出されることを
 * 想定しており、失敗しても詳細画面の表示自体は妨げない（呼び出し側でエラーを握りつぶす）。
 */
export async function markInquiryReadAction(inquiryId: string): Promise<void> {
  const id = inquiryIdSchema.parse(inquiryId);

  await markInquiryRead(id);

  revalidatePath(INQUIRY_LIST_PATH, "page");
}
