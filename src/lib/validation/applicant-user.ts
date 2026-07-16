import { z } from "zod";

import { APPLICANT_USER_PASSWORD_MIN_LENGTH } from "@/lib/constants/applicant-user";

/**
 * 申請者アカウント（ApplicantUser）新規作成フォームの入力値を検証する zod スキーマ。
 * メールアドレス形式・表示名必須・パスワード最小文字数
 * （`APPLICANT_USER_PASSWORD_MIN_LENGTH`以上）を検証する。
 */
export const applicantUserCreateFormSchema = z.object({
  email: z.string().trim().min(1).email(),
  displayName: z.string().trim().min(1),
  password: z.string().min(APPLICANT_USER_PASSWORD_MIN_LENGTH),
});

/**
 * `applicantUserCreateFormSchema` から推論されるフォーム入力値の型。
 */
export type ApplicantUserCreateFormValues = z.infer<
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
});

/**
 * `applicantUserUpdateFormSchema` から推論されるフォーム入力値の型。
 */
export type ApplicantUserUpdateFormValues = z.infer<
  typeof applicantUserUpdateFormSchema
>;
