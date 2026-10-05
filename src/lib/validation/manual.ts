import { z } from "zod";

import {
  DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/document";
import { DOCUMENT_COMPANY_CODES } from "@/lib/constants/document-company-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import {
  MANUAL_CATEGORIES,
  MANUAL_MAX_YEAR,
  MANUAL_MIN_YEAR,
} from "@/lib/constants/manual";
import { toGoogleEmbedUrl } from "@/lib/google-document-url";

/**
 * マニュアルの公開範囲検証定義。`documents`specの`documentTargetingSchema`・
 * `monthly-material`specの`monthlyMaterialTargetingSchema`と構造は同一だが、
 * 型・スキーマとしては独立させる。
 */
export const manualTargetingSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("all") }),
  z.object({
    scope: z.literal("countries"),
    countries: z.array(z.enum(INQUIRY_COUNTRY_CODES)).min(1),
  }),
  z.object({
    scope: z.literal("companies"),
    companyCodes: z.array(z.enum(DOCUMENT_COMPANY_CODES)).min(1),
  }),
]);

const manualSharedFields = {
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  category: z.enum(MANUAL_CATEGORIES),
  year: z.number().int().min(MANUAL_MIN_YEAR).max(MANUAL_MAX_YEAR),
  month: z.number().int().min(1).max(12),
  targeting: manualTargetingSchema,
};

const manualUploadSchema = z.object({
  ...manualSharedFields,
  sourceType: z.literal("upload"),
  fileName: z.string().trim().min(1),
  fileType: z.enum(DOCUMENT_ALLOWED_MIME_TYPES),
  fileSize: z.number().int().positive().max(DOCUMENT_MAX_FILE_SIZE_BYTES),
  dataUrl: z.string().trim().min(1).startsWith("data:application/pdf"),
});

const manualGoogleSchema = z.object({
  ...manualSharedFields,
  sourceType: z.literal("google"),
  googleUrl: z.string().trim().min(1),
  googleEmbedUrl: z.string().trim().min(1),
});

/**
 * マニュアルの新規登録・編集フォームの入力値を検証するzodスキーマ。タイトル・カテゴリ・年月・
 * 公開範囲は登録方式によらず必須とし、登録方式（`sourceType`）に応じてアップロード方式
 * （ファイル形式・サイズ）またはGoogle方式（共有リンクURLの形式）を検証する
 * （`documentFormSchema`・`monthlyMaterialFormSchema`と同型）。
 * タイトル・説明は日本語（`ja`）のみ入力し、他言語の翻訳はサーバーアクションが保存時に
 * 自動翻訳して付与するため、本スキーマは翻訳フィールドを受け付けない（送られても除去する）。
 */
export const manualFormSchema = z
  .discriminatedUnion("sourceType", [manualUploadSchema, manualGoogleSchema])
  .superRefine((data, ctx) => {
    if (data.sourceType === "google" && toGoogleEmbedUrl(data.googleUrl) === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid Google document URL",
        path: ["googleUrl"],
      });
    }
  });

/**
 * `manualFormSchema`から推論されるフォーム入力値の型（`useForm`の変換前入力型）。
 */
export type ManualFormValues = z.input<typeof manualFormSchema>;

/**
 * `manualFormSchema`のバリデーション・変換後（送信時）の型（`useForm`の変換後型）。
 */
export type ManualSubmitValues = z.output<typeof manualFormSchema>;
