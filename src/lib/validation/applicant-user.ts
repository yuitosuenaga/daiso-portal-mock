import { z } from "zod";

import {
  APPLICANT_USER_DEFAULT_LOCALE,
  APPLICANT_USER_PASSWORD_MIN_LENGTH,
  APPLICANT_USER_PREFERRED_LOCALE_CODES,
} from "@/lib/constants/applicant-user";

/**
 * 申請者アカウント（ApplicantUser）新規作成フォームの入力値を検証する zod スキーマ。
 * メールアドレス形式・表示名必須・パスワード最小文字数
 * （`APPLICANT_USER_PASSWORD_MIN_LENGTH`以上）を検証する。
 * `preferredLocale`（通知言語）は`APPLICANT_USER_PREFERRED_LOCALE_CODES`に
 * 含まれる値のみを許容し、未指定時は既定値`APPLICANT_USER_DEFAULT_LOCALE`とする。
 */
export const applicantUserCreateFormSchema = z.object({
  email: z.string().trim().min(1).email(),
  displayName: z.string().trim().min(1),
  password: z.string().min(APPLICANT_USER_PASSWORD_MIN_LENGTH),
  preferredLocale: z
    .enum(APPLICANT_USER_PREFERRED_LOCALE_CODES)
    .default(APPLICANT_USER_DEFAULT_LOCALE),
});

/**
 * `applicantUserCreateFormSchema` から推論されるフォーム入力値の型（バリデーション後）。
 * `preferredLocale`は`.default()`により必須（未指定時は既定値で補完済み）。
 */
export type ApplicantUserCreateFormValues = z.infer<
  typeof applicantUserCreateFormSchema
>;

/**
 * `applicantUserCreateFormSchema`のバリデーション前（フォーム入力）の型。
 * `preferredLocale`に`.default()`があるため、こちらは省略可能として推論される。
 * `react-hook-form`の`useForm`第1型引数（`TFieldValues`）に用いる。
 */
export type ApplicantUserCreateFormInput = z.input<
  typeof applicantUserCreateFormSchema
>;

/**
 * 申請者アカウント編集フォームの入力値を検証する zod スキーマ。
 * パスワードは空文字列または未指定を許容し（既存パスワードを保持）、
 * 入力がある場合のみ最小文字数要件を検証する。
 */
export const applicantUserUpdateFormSchema = z.object({
  email: z.string().trim().min(1).email(),
  displayName: z.string().trim().min(1),
  password: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.length >= APPLICANT_USER_PASSWORD_MIN_LENGTH,
      { message: "Password too short" }
    ),
  preferredLocale: z
    .enum(APPLICANT_USER_PREFERRED_LOCALE_CODES)
    .default(APPLICANT_USER_DEFAULT_LOCALE),
});

/**
 * `applicantUserUpdateFormSchema` から推論されるフォーム入力値の型（バリデーション後）。
 */
export type ApplicantUserUpdateFormValues = z.infer<
  typeof applicantUserUpdateFormSchema
>;

/**
 * `applicantUserUpdateFormSchema`のバリデーション前（フォーム入力）の型。
 * `useForm`の`TFieldValues`に用いる。
 */
export type ApplicantUserUpdateFormInput = z.input<
  typeof applicantUserUpdateFormSchema
>;
