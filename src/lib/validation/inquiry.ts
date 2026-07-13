import { z } from "zod";

import {
  INQUIRY_CATEGORY_CODES,
  INQUIRY_COUNTRY_CODES,
  INQUIRY_ORIGINAL_LANGUAGE_CODES,
  INQUIRY_URGENCY_CODES,
} from "@/lib/constants/inquiry-options";
import {
  ATTACHMENT_ALLOWED_MIME_TYPES,
  ATTACHMENT_MAX_COUNT,
  ATTACHMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/attachment";

/** 自由記述欄（originalText）の最大文字数。 */
export const ORIGINAL_TEXT_MAX_LENGTH = 2000;

/** タイトル（title）の最大文字数。 */
export const TITLE_MAX_LENGTH = 100;

/**
 * 添付ファイル1件分の形状・上限を検証するzodスキーマ。クライアント側の`AttachmentField`が
 * 選択時点で弾く内容と同じ制約をサーバー側でも再検証し、クライアント検証のバイパスに備える。
 * `helpdesk-inquiry-management`spec（返信の添付ファイル）が読み取り専用で再利用する。
 */
export const inquiryAttachmentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileType: z.enum(ATTACHMENT_ALLOWED_MIME_TYPES),
  fileSize: z.number().positive().max(ATTACHMENT_MAX_FILE_SIZE_BYTES),
  // data:<mime>;base64,<content> の形式のみ許可する（javascript: 等の他スキームを拒否する）
  dataUrl: z.string().regex(/^data:[a-zA-Z0-9!#$&.+\-^_]+\/[a-zA-Z0-9!#$&.+\-^_]+;base64,/),
});

/**
 * 添付ファイル一覧（件数上限つき）を検証するzodスキーマ。
 * `inquiryFormSchema`・`helpdesk-inquiry-management`spec所有の返信送信の両方が共有する。
 */
export const inquiryAttachmentsArraySchema = z
  .array(inquiryAttachmentSchema)
  .max(ATTACHMENT_MAX_COUNT);

/**
 * 問い合わせ・申請フォームの入力値を検証する zod スキーマ。
 * フィールド単位のエラーメッセージは呼び出し側（UI）が翻訳キー経由で表示する。
 */
export const inquiryFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(TITLE_MAX_LENGTH),
  category: z.enum(INQUIRY_CATEGORY_CODES),
  urgency: z.enum(INQUIRY_URGENCY_CODES),
  storeRegion: z
    .string()
    .trim()
    .min(1),
  originalText: z
    .string()
    .min(1)
    .max(ORIGINAL_TEXT_MAX_LENGTH),
  originalLanguage: z.enum(INQUIRY_ORIGINAL_LANGUAGE_CODES),
  companyName: z.string().trim().min(1),
  country: z.enum(INQUIRY_COUNTRY_CODES),
  attachments: inquiryAttachmentsArraySchema.optional(),
});

/**
 * `inquiryFormSchema` から推論されるフォーム入力値の型。
 */
export type InquiryFormValues = z.infer<typeof inquiryFormSchema>;
