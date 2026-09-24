import { z } from "zod";

import { ANNOUNCEMENT_CATEGORY_CODES } from "@/lib/constants/announcement-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { inquiryAttachmentsArraySchema } from "@/lib/validation/inquiry";
import { ATTACHMENT_MAX_COUNT } from "@/lib/constants/attachment";

/**
 * ドキュメント紐づけ（`linkedDocumentIds`）の検証スキーマ。件数上限は直接アップロード添付と
 * 同じ`ATTACHMENT_MAX_COUNT`を流用する。`Document`自体の存在確認はサービス層で行い、
 * ここではID配列としての形状のみを検証する。
 */
const linkedDocumentIdsSchema = z.array(z.string().min(1)).max(ATTACHMENT_MAX_COUNT);

const announcementTargetingSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("all") }),
  z.object({
    scope: z.literal("countries"),
    countries: z.array(z.enum(INQUIRY_COUNTRY_CODES)).min(1),
  }),
]);

/** 空文字・nullを`null`に変換する任意入力の日付（ISO日付 YYYY-MM-DD）フィールド。 */
const optionalDateField = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" ? null : trimmed;
  });

/**
 * `ja`・`en`以外の任意言語1件分のタイトル・本文の検証スキーマ。言語コードは自由入力
 * （例: `th`・`vi`・`zh`）とし、`ja`/`en`との重複・追加言語同士の重複は`superRefine`側で検証する。
 */
const announcementTranslationSchema = z.object({
  locale: z.string().trim().min(2).max(10),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
});

/** 追加言語1件分（`en`を除く）の上限件数。 */
const ANNOUNCEMENT_ADDITIONAL_TRANSLATIONS_MAX_COUNT = 20;

/**
 * お知らせ新規作成・編集フォームの入力値を検証する zod スキーマ。
 * タイトル・本文・種別を必須とし、配信対象を「特定の国・地域を指定」にした場合は
 * 1件以上の国が選択されていることを要求する。公開期間の終了日は開始日以降であること、
 * 対応要否が真の場合は対応期限の入力を必須とする。
 * タイトル・本文は言語別（`ja`は`title`/`body`、`en`は`titleEn`/`bodyEn`）に入力し、
 * `translations`で`ja`/`en`以外の任意言語（重複不可）を追加できる。
 *
 * `titleEn`/`bodyEn`は両方入力するか、両方未入力のいずれかのみを許可する（片方だけの入力は
 * エラー）。両方未入力の場合、呼び出し元（`src/lib/actions/announcements.ts`の
 * `ensureEnTranslation`）がja本文からClaude APIで自動翻訳しen行を補う。
 * 出力（`translations`）は、titleEn/bodyEnが入力されていればそこからen行を合成し、
 * 未入力かつ既にtranslations側にen行がある場合（2回目のparse時の冪等性）はそれを維持し、
 * どちらもなければen行を作らない。
 */
export const announcementFormSchema = z
  .object({
    title: z.string().trim().min(1),
    body: z.string().trim().min(1),
    // 空文字は「未入力」として扱う（未入力の場合は保存時にja本文から自動翻訳される）。
    titleEn: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : undefined)),
    bodyEn: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : undefined)),
    translations: z.array(announcementTranslationSchema).default([]),
    category: z.enum(ANNOUNCEMENT_CATEGORY_CODES),
    status: z.enum(["draft", "published"]),
    targeting: announcementTargetingSchema,
    actionRequired: z.boolean(),
    sendEmailNotification: z.boolean(),
    publishStartDate: optionalDateField,
    publishEndDate: optionalDateField,
    dueDate: optionalDateField,
    attachments: inquiryAttachmentsArraySchema.default([]),
    linkedDocumentIds: linkedDocumentIdsSchema.default([]),
  })
  .superRefine((values, ctx) => {
    if (
      values.publishStartDate &&
      values.publishEndDate &&
      values.publishEndDate < values.publishStartDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publishEndDate"],
        message: "publishEndDate must be on or after publishStartDate",
      });
    }
    if (values.actionRequired && !values.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDate"],
        message: "dueDate is required when actionRequired is true",
      });
    }

    // titleEn/bodyEnは両方入力するか、両方未入力（保存時に自動翻訳）のいずれかのみを許可する。
    const titleEnProvided = values.titleEn !== undefined;
    const bodyEnProvided = values.bodyEn !== undefined;
    if (titleEnProvided !== bodyEnProvided) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: titleEnProvided ? ["bodyEn"] : ["titleEn"],
        message: "titleEn and bodyEn must be provided together, or both left empty",
      });
    }

    const additionalTranslations = values.translations.filter(
      (translation) => translation.locale !== "en"
    );
    if (additionalTranslations.length > ANNOUNCEMENT_ADDITIONAL_TRANSLATIONS_MAX_COUNT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["translations"],
        message: `translations must contain at most ${ANNOUNCEMENT_ADDITIONAL_TRANSLATIONS_MAX_COUNT} additional languages`,
      });
    }

    // `titleEn`/`bodyEn`が両方とも未指定（2回目のパース、`en`は既に`translations`側へ
    // 合成されている想定）の場合のみ、`translations`内の`en`行を重複扱いしない。
    // `titleEn`/`bodyEn`が指定されている（1回目のパース、フォーム入力）場合に
    // `translations`にも`en`が含まれているのは不正な重複指定として扱う。
    const isSecondPass = values.titleEn === undefined && values.bodyEn === undefined;

    const seenLocales = new Set<string>(["ja", "en"]);
    values.translations.forEach((translation, index) => {
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
  .transform(({ titleEn, bodyEn, translations, ...values }) => {
    const enFromTranslations = translations.find((translation) => translation.locale === "en");
    const additionalTranslations = translations.filter(
      (translation) => translation.locale !== "en"
    );

    // titleEn/bodyEnが入力されていれば、その内容でen行を合成する（手入力優先）。
    // 未入力の場合、既存のtranslations側にen行があれば（2回目のparse）それを維持する。
    // どちらもない場合はen行を作らない（呼び出し元が保存時に自動翻訳してen行を補う）。
    const resolvedEnTranslation =
      titleEn !== undefined
        ? { locale: "en", title: titleEn, body: bodyEn ?? "" }
        : enFromTranslations;

    return {
      ...values,
      dueDate: values.actionRequired ? values.dueDate : null,
      translations: resolvedEnTranslation
        ? [resolvedEnTranslation, ...additionalTranslations]
        : additionalTranslations,
    };
  });

/**
 * `announcementFormSchema` から推論されるフォーム入力値の型。
 * 公開期間・対応期限は`<input type="date">`が扱う生の文字列（空文字＝未入力）として
 * 表現するため、変換後の型（`z.infer`/`z.output`）ではなく変換前の入力型（`z.input`）を用いる。
 * 送信時（`parse`後）は空文字が`null`に変換され、`CreateAnnouncementInput`と一致する。
 */
export type AnnouncementFormValues = z.input<typeof announcementFormSchema>;

/**
 * `announcementFormSchema`のバリデーション・変換後（送信時）の型。
 * `useForm`の変換後型（`TTransformedValues`）として使用し、`onSubmit`に渡る値の型を
 * 変換後の実体（空文字が`null`に変換済み）と一致させる。
 */
export type AnnouncementSubmitValues = z.output<typeof announcementFormSchema>;
