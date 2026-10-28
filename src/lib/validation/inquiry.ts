import { z } from "zod";

import {
  INQUIRY_CATEGORY_CODES,
  INQUIRY_ORIGINAL_LANGUAGE_CODES,
  INQUIRY_URGENCY_CODES,
} from "@/lib/constants/inquiry-options";
import {
  ATTACHMENT_ALLOWED_MIME_TYPES,
  ATTACHMENT_MAX_COUNT,
  ATTACHMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/attachment";
import { TEXT_LIMITS } from "@/lib/constants/text-limits";
import { findAttachmentsIntegrityIssue } from "@/lib/validation/attachment-integrity";

/** 自由記述欄（originalText）の最大文字数。 */
export const ORIGINAL_TEXT_MAX_LENGTH = 2000;

/** 店舗・地域（storeRegion）の最大文字数。 */
export const STORE_REGION_MAX_LENGTH = 100;

/**
 * 申請者メッセージ・ヘルプデスク返信の本文の最大文字数。
 * 返信テンプレート本文の上限（`TEXT_LIMITS.body`）と揃え、テンプレートをそのまま返信に使えるようにする。
 */
export const MESSAGE_BODY_MAX_LENGTH = TEXT_LIMITS.body;

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
 * `inquiryAttachmentsArraySchema` に、dataUrl の実体との整合性検証（デコード後サイズ・宣言サイズ・
 * MIME・拡張子・マジックバイト・合計サイズ）を加えたサーバー側の厳格スキーマ。
 * 問い合わせ作成・申請者メッセージ・ヘルプデスク返信の全経路（Server Action と JSON API）が使う。
 * お知らせの添付は従来の `inquiryAttachmentsArraySchema` のまま（対象外）。
 */
export const inquiryAttachmentsStrictSchema = inquiryAttachmentsArraySchema.superRefine(
  (attachments, ctx) => {
    const found = findAttachmentsIntegrityIssue(attachments);
    if (found) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [found.index],
        message: `Invalid attachment: ${found.issue}`,
      });
    }
  }
);

/**
 * 問い合わせ・申請フォームの入力値を検証する zod スキーマ。
 * フィールド単位のエラーメッセージは呼び出し側（UI）が翻訳キー経由で表示する。
 */
export const inquiryFormSchema = z
  .object({
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
      .min(1)
      .max(STORE_REGION_MAX_LENGTH),
    originalText: z
      .string()
      .min(1)
      .max(ORIGINAL_TEXT_MAX_LENGTH),
    originalLanguage: z.enum(INQUIRY_ORIGINAL_LANGUAGE_CODES),
    attachments: inquiryAttachmentsArraySchema.optional(),
    /**
     * ヘルプデスク代理登録モードかどうか（要件12）。フォームの表示切り替えにのみ使い、
     * サーバー側のアクセス制御はセッションのロール検証（`createInquiry`）で行う。
     */
    mode: z.enum(["self", "helpdeskProxy"]).optional(),
    /** ヘルプデスク代理登録モードのときのみ必須の対象会社ID。 */
    targetCompanyId: z.string().trim().min(1).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.mode === "helpdeskProxy" && !values.targetCompanyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetCompanyId"],
        message: "Target company is required in helpdesk proxy mode",
      });
    }
  });

/**
 * `inquiryFormSchema` から推論されるフォーム入力値の型。
 */
export type InquiryFormValues = z.infer<typeof inquiryFormSchema>;

/**
 * 問い合わせ・申請作成のサーバー側入力契約（`CreateInquiryInput`）を検証する zod スキーマ。
 * `POST /api/inquiries`・`createInquiryAction`（Server Action）の両方の入口で共有し、
 * クライアント検証のバイパスに備える。`status`・`createdAt`・`submittedBy`は信頼境界の外の
 * 値のため定義せず、送られてきても（zod objectの既定動作で）読み捨てる。
 */
export const createInquirySchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX_LENGTH),
  category: z.enum(INQUIRY_CATEGORY_CODES),
  urgency: z.enum(INQUIRY_URGENCY_CODES),
  storeRegion: z.string().trim().min(1).max(STORE_REGION_MAX_LENGTH),
  originalText: z.string().min(1).max(ORIGINAL_TEXT_MAX_LENGTH),
  originalLanguage: z.enum(INQUIRY_ORIGINAL_LANGUAGE_CODES),
  attachments: inquiryAttachmentsStrictSchema.optional(),
});
