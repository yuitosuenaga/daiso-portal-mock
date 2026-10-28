import { z } from "zod";

import { APPLICANT_USER_PASSWORD_MIN_LENGTH } from "@/lib/constants/applicant-user";
import { emailSchema } from "@/lib/validation/email";

/** スタッフに付与できるロール。 */
export const HELPDESK_STAFF_ROLES = ["admin", "member"] as const;

/**
 * スタッフ新規作成フォームの入力値を検証する zod スキーマ。
 * メールアドレスはtrimして小文字化する（Google照合・重複検査が大文字小文字非区別のため）。
 * パスワードは任意（空欄・未指定=Googleログイン専用）で、入力時のみ最小文字数
 * （申請者アカウントと同じ定数）を検証する。ロールの既定は`member`。
 */
export const helpdeskStaffCreateFormSchema = z.object({
  email: emailSchema,
  displayName: z.string().trim().min(1),
  password: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.length >= APPLICANT_USER_PASSWORD_MIN_LENGTH,
      { message: "Password too short" }
    ),
  role: z.enum(HELPDESK_STAFF_ROLES).default("member"),
});

/** バリデーション後の値の型（`role`は既定値補完済み）。 */
export type HelpdeskStaffCreateFormValues = z.infer<typeof helpdeskStaffCreateFormSchema>;

/** バリデーション前（フォーム入力）の型。`useForm`の`TFieldValues`に用いる。 */
export type HelpdeskStaffCreateFormInput = z.input<typeof helpdeskStaffCreateFormSchema>;
