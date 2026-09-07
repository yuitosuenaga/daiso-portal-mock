import { z } from "zod";

import {
  DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/document";
import { DOCUMENT_COMPANY_CODES } from "@/lib/constants/document-company-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import {
  MONTHLY_MATERIAL_CATEGORIES,
  MONTHLY_MATERIAL_MAX_YEAR,
  MONTHLY_MATERIAL_MIN_YEAR,
} from "@/lib/constants/monthly-material";
import { toGoogleEmbedUrl } from "@/lib/google-document-url";

/**
 * 月次資料の公開範囲検証定義。`documents`specの`documentTargetingSchema`と構造は同一だが、
 * 型・スキーマとしては独立させる（本spec要件のAdjacent expectations参照）。
 */
export const monthlyMaterialTargetingSchema = z.discriminatedUnion("scope", [
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

const monthlyMaterialUploadSchema = z.object({
  category: z.enum(MONTHLY_MATERIAL_CATEGORIES),
  year: z.number().int().min(MONTHLY_MATERIAL_MIN_YEAR).max(MONTHLY_MATERIAL_MAX_YEAR),
  month: z.number().int().min(1).max(12),
  sourceType: z.literal("upload"),
  fileName: z.string().trim().min(1),
  fileType: z.enum(DOCUMENT_ALLOWED_MIME_TYPES),
  fileSize: z.number().int().positive().max(DOCUMENT_MAX_FILE_SIZE_BYTES),
  dataUrl: z.string().trim().min(1).startsWith("data:application/pdf"),
  targeting: monthlyMaterialTargetingSchema,
});

const monthlyMaterialGoogleSchema = z.object({
  category: z.enum(MONTHLY_MATERIAL_CATEGORIES),
  year: z.number().int().min(MONTHLY_MATERIAL_MIN_YEAR).max(MONTHLY_MATERIAL_MAX_YEAR),
  month: z.number().int().min(1).max(12),
  sourceType: z.literal("google"),
  googleUrl: z.string().trim().min(1),
  googleEmbedUrl: z.string().trim().min(1),
  targeting: monthlyMaterialTargetingSchema,
});

/**
 * 月次資料の新規登録・編集フォームの入力値を検証するzodスキーマ。年・月・公開範囲は
 * 登録方式によらず必須とし、登録方式（`sourceType`）に応じてアップロード方式（ファイル形式・
 * サイズ）またはGoogle方式（共有リンクURLの形式）を検証する（`documentFormSchema`と同型）。
 */
export const monthlyMaterialFormSchema = z
  .discriminatedUnion("sourceType", [monthlyMaterialUploadSchema, monthlyMaterialGoogleSchema])
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
 * `monthlyMaterialFormSchema`から推論されるフォーム入力値の型（`useForm`の変換前入力型）。
 */
export type MonthlyMaterialFormValues = z.input<typeof monthlyMaterialFormSchema>;

/**
 * `monthlyMaterialFormSchema`のバリデーション後（送信時）の型（`useForm`の変換後型）。
 */
export type MonthlyMaterialSubmitValues = z.output<typeof monthlyMaterialFormSchema>;
