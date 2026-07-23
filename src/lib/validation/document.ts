import { z } from "zod";

import {
  DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/document";
import { DOCUMENT_COMPANY_CODES } from "@/lib/constants/document-company-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { toGoogleEmbedUrl } from "@/lib/google-document-url";

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

const documentUploadSchema = z.object({
  sourceType: z.literal("upload"),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  status: z.enum(["draft", "published"]),
  fileName: z.string().trim().min(1),
  fileType: z.enum(DOCUMENT_ALLOWED_MIME_TYPES),
  fileSize: z.number().int().positive().max(DOCUMENT_MAX_FILE_SIZE_BYTES),
  dataUrl: z.string().trim().min(1).startsWith("data:application/pdf"),
  targeting: documentTargetingSchema,
});

const documentGoogleSchema = z.object({
  sourceType: z.literal("google"),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  status: z.enum(["draft", "published"]),
  googleUrl: z.string().trim().min(1),
  googleEmbedUrl: z.string().trim().min(1),
  targeting: documentTargetingSchema,
});

/**
 * ドキュメント新規作成・編集フォームの入力値を検証する zod スキーマ。
 * タイトルと公開範囲は登録方法によらず必須とし、登録方法（`sourceType`）に応じて
 * アップロード方式（ファイル形式・サイズ）またはGoogle方式（共有リンクURLの形式）を検証する。
 * `googleUrl`は、iframe埋め込み用URLへの変換結果が得られること（＝Googleドキュメント/
 * スプレッドシート/スライドの有効なURLパターンであること）を条件とする。
 */
export const documentFormSchema = z
  .discriminatedUnion("sourceType", [documentUploadSchema, documentGoogleSchema])
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
 * `documentFormSchema` から推論されるフォーム入力値の型。
 */
export type DocumentFormValues = z.infer<typeof documentFormSchema>;
