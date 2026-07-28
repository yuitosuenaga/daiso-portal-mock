import { z } from "zod";

import {
  DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/document";
import { DOCUMENT_COMPANY_CODES } from "@/lib/constants/document-company-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { toGoogleEmbedUrl } from "@/lib/google-document-url";

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

/**
 * `ja`・`en`以外の任意言語1件分のタイトル・説明の検証スキーマ。言語コードは自由入力
 * （例: `th`・`vi`・`zh`）とし、`ja`/`en`との重複・追加言語同士の重複は`superRefine`側で検証する。
 * `announcementTranslationSchema`と同型だが、`body`の代わりに任意の`description`を持つ。
 */
const documentTranslationSchema = z.object({
  locale: z.string().trim().min(2).max(10),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

/** 追加言語1件分（`en`を除く）の上限件数。`announcementFormSchema`と同一の上限値。 */
const DOCUMENT_ADDITIONAL_TRANSLATIONS_MAX_COUNT = 20;

const documentUploadSchema = z.object({
  sourceType: z.literal("upload"),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  titleEn: z.string().trim().min(1).optional(),
  descriptionEn: z.string().trim().optional(),
  translations: z.array(documentTranslationSchema).default([]),
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
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  titleEn: z.string().trim().min(1).optional(),
  descriptionEn: z.string().trim().optional(),
  translations: z.array(documentTranslationSchema).default([]),
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
 * タイトル・説明は言語別（`ja`は`title`/`description`、`en`は`titleEn`/`descriptionEn`、
 * `en`のタイトルは実質必須）に入力し、`translations`で`ja`/`en`以外の任意言語
 * （重複不可、上限20件）を追加できる（`announcementFormSchema`と同型のロジック）。
 *
 * `titleEn`は型としては任意（`optional`）だが、`superRefine`で実質必須として検証する。
 * これは、サービス層に渡す出力（`translations`に`en`行を合成済み）を本スキーマで再検証
 * （サーバーアクション側の多重防御）した場合に、既に`en`が`translations`側へ合成されていて
 * `titleEn`が存在しない状態でも冪等に検証を通せるようにするため
 * （`translations`内の`en`行から実質的な値を導出する）。
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

    const additionalTranslations = data.translations.filter(
      (translation) => translation.locale !== "en"
    );
    if (additionalTranslations.length > DOCUMENT_ADDITIONAL_TRANSLATIONS_MAX_COUNT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["translations"],
        message: `translations must contain at most ${DOCUMENT_ADDITIONAL_TRANSLATIONS_MAX_COUNT} additional languages`,
      });
    }

    // `titleEn`が未指定（2回目のパース、`en`は既に`translations`側へ合成されている想定）の
    // 場合のみ、`translations`内の`en`行を重複扱いしない。`titleEn`が指定されている
    // （1回目のパース、フォーム入力）場合に`translations`にも`en`が含まれているのは
    // 不正な重複指定として扱う。
    const isSecondPass = data.titleEn === undefined && data.descriptionEn === undefined;

    const seenLocales = new Set<string>(["ja", "en"]);
    data.translations.forEach((translation, index) => {
      if (translation.locale === "en" && isSecondPass) {
        return;
      }
      const locale = translation.locale.toLowerCase();
      if (seenLocales.has(locale)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["translations", index, "locale"],
          message: "locale must not duplicate ja, en, or another translation's locale",
        });
        return;
      }
      seenLocales.add(locale);
    });
  })
  .transform((data) => {
    const { titleEn, descriptionEn, translations, ...rest } = data;
    const enFromTranslations = translations.find(
      (translation) => translation.locale === "en"
    );
    const resolvedTitleEn = titleEn ?? enFromTranslations?.title ?? "";
    const resolvedDescriptionEn = descriptionEn ?? enFromTranslations?.description;
    const additionalTranslations = translations.filter(
      (translation) => translation.locale !== "en"
    );

    return {
      ...rest,
      translations: [
        { locale: "en", title: resolvedTitleEn, description: resolvedDescriptionEn },
        ...additionalTranslations,
      ],
    };
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
