"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { appendInquiryHistoryEntry } from "@/lib/api/inquiry-history";
import {
  getInquiryById,
  setInquiryClaim,
  updateInquiryStatus,
  updateInquiryStatusIfCurrent,
} from "@/lib/api/inquiries";
import {
  createReplyTemplate,
  getReplyTemplateById,
  updateReplyTemplate,
} from "@/lib/api/reply-templates";
import { TRANSLATED_LOCALES } from "@/lib/constants/locales";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import { autoTranslateFields } from "@/lib/server/auto-translation";
import {
  findReplyTemplateById,
  upsertReplyTemplateTranslations,
} from "@/lib/server/reply-template-service";
import { ClaimOwnershipError } from "@/lib/server/inquiry-service";
import { translateInquiryAndStore } from "@/lib/server/inquiry-translation-service";
import { INQUIRY_STATUS_CODES } from "@/lib/constants/inquiry-options";
import {
  replyTemplateFormSchema,
  type ReplyTemplateFormValues,
} from "@/lib/validation/reply-template";
import { inquiryAttachmentsArraySchema } from "@/lib/validation/inquiry";
import type { Inquiry } from "@/types/inquiry";
import type { InquiryAttachment } from "@/types/attachment";
import type {
  ReplyTemplate,
  ReplyTemplateTranslationView,
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
 * 問い合わせの自動翻訳を再実行する。ヘルプデスク担当者のセッションを要求する。
 */
export async function retryInquiryTranslationAction(inquiryId: string): Promise<void> {
  const id = inquiryIdSchema.parse(inquiryId);
  await requireHelpdeskStaffSession();

  await translateInquiryAndStore(id);
  revalidateInquiryRoutes();
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

export type ReleaseClaimResult = { ok: true } | { ok: false; reason: "notOwner" };

/**
 * 対応中フラグを解除し、対応履歴に記録したうえで一覧・詳細ルートを再検証する。
 * 解除操作を行う担当者が対象の所有者でない場合（`ClaimOwnershipError`）は、
 * 解除を実行せず・履歴も記録せず、`{ ok: false, reason: "notOwner" }`を返す。
 * 想定外の例外は再throwし、呼び出し元の汎用エラー処理にフォールバックさせる。
 */
export async function releaseInquiryClaimAction(
  inquiryId: string
): Promise<ReleaseClaimResult> {
  const id = inquiryIdSchema.parse(inquiryId);
  const { claims } = await requireHelpdeskStaffSession();

  try {
    await setInquiryClaim(id, null);
  } catch (error) {
    if (error instanceof ClaimOwnershipError) {
      return { ok: false, reason: "notOwner" };
    }
    throw error;
  }

  await appendInquiryHistoryEntry({
    inquiryId: id,
    type: "released",
    actorName: claims.displayName,
    occurredAt: new Date().toISOString(),
  });
  revalidateInquiryRoutes();
  return { ok: true };
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
 * 返信送信内容（添付ファイルを含む）を対応履歴に記録し、一覧・詳細ルートを再検証する。
 * 添付ファイルは`inquiry-form`spec所有の`inquiryAttachmentsArraySchema`（件数上限・サイズ・形式を検証）でサーバー側検証する。
 *
 * 送信直前の`status`が`new`（新規）の場合、返信をもって対応が開始されたとみなし
 * `in_progress`（対応中）へ自動的に変更する（変更内容は対応履歴にも記録する）。
 * 既に`in_progress`・`resolved`の問い合わせに返信しても`status`は変更しない
 * （`resolved`案件への返信で自動的に再オープンはしない）。
 *
 * `status`が`new`かどうかの判定と変更は、`updateInquiryStatusIfCurrent`による
 * `WHERE status = 'new'`条件付きの単一更新で原子的に行う。読み取ってから条件なしで
 * 書き込む方式だと、読み取り後・書き込み前に他の担当者が`changeInquiryStatusAction`で
 * 状態を変えた場合（例: 先に`resolved`にした直後）に上書きしてしまう競合が起こり得るため。
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

  const didAutoTransition = await updateInquiryStatusIfCurrent(
    id,
    "new",
    "in_progress"
  );

  if (didAutoTransition) {
    const t = await getTranslations("inquiryList.status");
    await appendInquiryHistoryEntry({
      inquiryId: id,
      type: "status_changed",
      actorName: claims.displayName,
      occurredAt: new Date().toISOString(),
      detail: `${t("new")} → ${t("in_progress")}`,
    });
  }

  revalidateInquiryRoutes();
}

/** テンプレート保存系アクションの結果。`failedLocales`が空でなければ一部言語の自動翻訳が未保存。 */
export interface ReplyTemplateSaveResult {
  template: ReplyTemplate;
  failedLocales: string[];
}

function toTemplateTranslationViews(
  translations: Record<string, Record<string, string>>
): ReplyTemplateTranslationView[] {
  return Object.entries(translations).map(([locale, fields]) => ({
    locale,
    name: fields.name,
    body: fields.body,
  }));
}

/**
 * テンプレートを新規作成し、テンプレート一覧・問い合わせ詳細ルートを再検証する。
 * 名称・本文を全対応言語へ自動翻訳して保存し、翻訳に失敗しても保存は継続する（失敗localeは`failedLocales`）。
 * 不正な入力（カテゴリ・本文の未入力）は保存せず例外を送出する。
 */
export async function createReplyTemplateAction(
  input: ReplyTemplateFormValues
): Promise<ReplyTemplateSaveResult> {
  const parsed = replyTemplateFormSchema.parse(input);
  const { translations, failedLocales } = await autoTranslateFields({
    name: parsed.name,
    body: parsed.body,
  });
  const created = await createReplyTemplate({
    ...parsed,
    translations: toTemplateTranslationViews(translations),
  });
  revalidatePath(TEMPLATE_LIST_PATH, "page");
  revalidatePath(INQUIRY_DETAIL_PATH, "page");

  return { template: created, failedLocales };
}

/**
 * 既存テンプレートの内容を更新し、テンプレート一覧・問い合わせ詳細ルートを再検証する。
 * 日本語の名称・本文が変わった場合のみ全言語を再翻訳し、変わらなければ既存の翻訳を維持する。
 * 不正な入力（カテゴリ・本文の未入力）は保存せず例外を送出する。
 */
export async function updateReplyTemplateAction(
  id: string,
  input: ReplyTemplateFormValues
): Promise<ReplyTemplateSaveResult> {
  const parsed = replyTemplateFormSchema.parse(input);
  const existing = await getReplyTemplateById(id);
  if (!existing) {
    throw new Error(`ReplyTemplate not found: ${id}`);
  }

  const sourceChanged = existing.name !== parsed.name || existing.body !== parsed.body;
  let translations = existing.translations ?? [];
  let failedLocales: string[] = [];
  if (sourceChanged) {
    const result = await autoTranslateFields({ name: parsed.name, body: parsed.body });
    translations = toTemplateTranslationViews(result.translations);
    failedLocales = result.failedLocales;
  }

  const updated = await updateReplyTemplate(id, { ...parsed, translations });
  revalidatePath(TEMPLATE_LIST_PATH, "page");
  revalidatePath(INQUIRY_DETAIL_PATH, "page");

  return { template: updated, failedLocales };
}

/**
 * 不足している言語だけを翻訳して保存する。ヘルプデスクセッションを要求する。
 */
export async function retranslateReplyTemplateAction(
  id: string
): Promise<{ failedLocales: string[] }> {
  await requireHelpdeskStaffSession();

  const template = await findReplyTemplateById(id);
  if (!template) {
    throw new Error(`ReplyTemplate not found: ${id}`);
  }

  const existingLocales = new Set((template.translations ?? []).map((translation) => translation.locale));
  const missingLocales = TRANSLATED_LOCALES.filter((locale) => !existingLocales.has(locale));
  if (missingLocales.length === 0) {
    return { failedLocales: [] };
  }

  const { translations, failedLocales } = await autoTranslateFields(
    { name: template.name, body: template.body },
    { locales: missingLocales }
  );
  const views = toTemplateTranslationViews(translations);
  if (views.length > 0) {
    await upsertReplyTemplateTranslations(id, views);
    revalidatePath(TEMPLATE_LIST_PATH, "page");
    revalidatePath(INQUIRY_DETAIL_PATH, "page");
  }

  return { failedLocales };
}
