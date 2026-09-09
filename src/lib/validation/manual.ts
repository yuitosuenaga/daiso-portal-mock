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

/**
 * `en`翻訳1件分の検証スキーマ。マニュアルはja/enの2言語のみ対応し、`documents`specのような
 * 任意追加言語（`vi`等）の機能は持たないため、`locale`は`en`固定で受け取る
 * （`documentFormSchema`の`translations`と異なり、フォーム側からの二重パース時に
 * `en`行を復元できるようにするための内部表現）。
 */
const manualTranslationSchema = z.object({
  locale: z.string().trim().min(2).max(10),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

const manualSharedFields = {
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  // `titleEn`は型としては任意（`optional`）だが、`superRefine`で実質必須として検証する。
  // これは、サービス層に渡す出力（`translations`に`en`行を合成済み）を本スキーマで再検証
  // （サーバーアクション側の多重防御）した場合に、既に`en`が`translations`側へ合成されていて
  // `titleEn`が存在しない状態でも冪等に検証を通せるようにするため
  // （`documentFormSchema`の`titleEn`と同型の対処）。
  titleEn: z.string().trim().min(1).optional(),
  descriptionEn: z.string().trim().optional(),
  translations: z.array(manualTranslationSchema).default([]),
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
 * タイトル・説明は言語別（`ja`は`title`/`description`、`en`は`titleEn`/`descriptionEn`）に
 * 入力し、`en`のタイトルは実質必須とする。`documents`specと異なり、ja/en以外の追加言語は
 * 対応しない。
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

    const enFromTranslations = data.translations.find(
      (translation) => translation.locale === "en"
    );
    const effectiveTitleEn = data.titleEn ?? enFromTranslations?.title;
    if (!effectiveTitleEn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["titleEn"],
        message: "titleEn is required",
      });
    }
  })
  .transform((data) => {
    const { titleEn, descriptionEn, translations, ...rest } = data;
    const enFromTranslations = translations.find(
      (translation) => translation.locale === "en"
    );
    const resolvedTitleEn = titleEn ?? enFromTranslations?.title ?? "";
    const resolvedDescriptionEn = descriptionEn ?? enFromTranslations?.description;

    return {
      ...rest,
      translations: [
        { locale: "en", title: resolvedTitleEn, description: resolvedDescriptionEn },
      ],
    };
  });

/**
 * `manualFormSchema`から推論されるフォーム入力値の型（`useForm`の変換前入力型）。
 */
export type ManualFormValues = z.input<typeof manualFormSchema>;

/**
 * `manualFormSchema`のバリデーション・変換後（送信時）の型（`useForm`の変換後型）。
 */
export type ManualSubmitValues = z.output<typeof manualFormSchema>;
