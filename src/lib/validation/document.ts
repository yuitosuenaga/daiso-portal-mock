import { z } from "zod";

import {
  DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/document";
import { DOCUMENT_COMPANY_CODES } from "@/lib/constants/document-company-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";

const documentTargetingSchema = z.discriminatedUnion("scope", [
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

/**
 * ドキュメント新規作成・編集フォームの入力値を検証する zod スキーマ。
 * タイトルとファイル（PDF・上限サイズ以下）を必須とし、公開範囲を「特定の国・地域を指定」
 * または「特定の販社を指定」にした場合は1件以上の選択を要求する。
 */
export const documentFormSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  fileName: z.string().trim().min(1),
  fileType: z.enum(DOCUMENT_ALLOWED_MIME_TYPES),
  fileSize: z.number().int().positive().max(DOCUMENT_MAX_FILE_SIZE_BYTES),
  dataUrl: z.string().trim().min(1).startsWith("data:application/pdf"),
  targeting: documentTargetingSchema,
});

/**
 * `documentFormSchema` から推論されるフォーム入力値の型。
 */
export type DocumentFormValues = z.infer<typeof documentFormSchema>;
