import { z } from "zod";

import {
  DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/document";
import { DOCUMENT_COMPANY_CODES } from "@/lib/constants/document-company-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { toGoogleEmbedUrl } from "@/lib/google-document-url";
import { TEXT_LIMITS } from "@/lib/constants/text-limits";

/**
 * ドキュメント・カテゴリ双方の公開範囲検証定義。`validation/document-category.ts`から
 * 再利用するためexportし、選択肢定義を二重に持たない（要件21.2）。
 */
export const documentTargetingSchema = z.discriminatedUnion("scope", [
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
  title: z.string().trim().min(1).max(TEXT_LIMITS.title),
  description: z.string().trim().max(TEXT_LIMITS.description).optional(),
  status: z.enum(["draft", "published"]),
  fileName: z.string().trim().min(1),
  fileType: z.enum(DOCUMENT_ALLOWED_MIME_TYPES),
  fileSize: z.number().int().positive().max(DOCUMENT_MAX_FILE_SIZE_BYTES),
  dataUrl: z.string().trim().min(1).startsWith("data:application/pdf"),
  targeting: documentTargetingSchema,
  // 大分類は必須（要件18.6）、中分類は任意（未選択は`null`。要件18.3）。
  // 大分類・中分類の親子整合（要件18.9）はzodでは検証できないため、サービス層の
  // `assertDocumentCategoryPair`とフォームの選択肢制御（要件18.7）で担保する。
  categoryId: z.string().trim().min(1),
  // フォーム側は未選択（「なし」）を空文字列で表現するため、`transform`で空文字列を`null`へ
  // 正規化する（空文字列のまま`min(1)`等で検証すると未選択を表現できなくなるため）。
  subCategoryId: z
    .string()
    .trim()
    .nullable()
    .default(null)
    .transform((value) => (value ? value : null)),
});

const documentGoogleSchema = z.object({
  sourceType: z.literal("google"),
  title: z.string().trim().min(1).max(TEXT_LIMITS.title),
  description: z.string().trim().max(TEXT_LIMITS.description).optional(),
  status: z.enum(["draft", "published"]),
  googleUrl: z.string().trim().min(1),
  googleEmbedUrl: z.string().trim().min(1),
  targeting: documentTargetingSchema,
  categoryId: z.string().trim().min(1),
  // フォーム側は未選択（「なし」）を空文字列で表現するため、`transform`で空文字列を`null`へ
  // 正規化する（空文字列のまま`min(1)`等で検証すると未選択を表現できなくなるため）。
  subCategoryId: z
    .string()
    .trim()
    .nullable()
    .default(null)
    .transform((value) => (value ? value : null)),
});

/**
 * ドキュメント新規作成・編集フォームの入力値を検証する zod スキーマ。
 * タイトルと公開範囲は登録方法によらず必須とし、登録方法（`sourceType`）に応じて
 * アップロード方式（ファイル形式・サイズ）またはGoogle方式（共有リンクURLの形式）を検証する。
 * `googleUrl`は、iframe埋め込み用URLへの変換結果が得られること（＝Googleドキュメント/
 * スプレッドシート/スライドの有効なURLパターンであること）を条件とする。
 *
 * タイトル・説明は日本語（`ja`）のみを入力する。他言語の翻訳はクライアントから受け取らず、
 * Server Action側で`autoTranslateFields`により自動生成して保存する。
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
 * `useForm`の変換前の入力型（`z.input`）を用いる（`AnnouncementFormValues`と同型）。
 */
export type DocumentFormValues = z.input<typeof documentFormSchema>;

/**
 * `documentFormSchema`のバリデーション・変換後（送信時）の型。
 * `useForm`の変換後型（`TTransformedValues`）として使用する（`AnnouncementSubmitValues`と同型）。
 */
export type DocumentSubmitValues = z.output<typeof documentFormSchema>;
