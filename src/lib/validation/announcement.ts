import { z } from "zod";

import { ANNOUNCEMENT_CATEGORY_CODES } from "@/lib/constants/announcement-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";

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
 * お知らせ新規作成・編集フォームの入力値を検証する zod スキーマ。
 * タイトル・本文・種別を必須とし、配信対象を「特定の国・地域を指定」にした場合は
 * 1件以上の国が選択されていることを要求する。公開期間の終了日は開始日以降であること、
 * 対応要否が真の場合は対応期限の入力を必須とする。
 */
export const announcementFormSchema = z
  .object({
    title: z.string().trim().min(1),
    body: z.string().trim().min(1),
    category: z.enum(ANNOUNCEMENT_CATEGORY_CODES),
    targeting: announcementTargetingSchema,
    actionRequired: z.boolean(),
    publishStartDate: optionalDateField,
    publishEndDate: optionalDateField,
    dueDate: optionalDateField,
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
  })
  .transform((values) => ({
    ...values,
    dueDate: values.actionRequired ? values.dueDate : null,
  }));

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
