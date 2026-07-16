import { z } from "zod";

/**
 * 販社（Company）新規作成・編集フォームの入力値を検証する zod スキーマ。
 * 会社名・国・販社コードをすべて必須とし、空文字列・空白のみの入力を拒否する。
 */
export const companyFormSchema = z.object({
  name: z.string().trim().min(1),
  country: z.string().trim().min(1),
  companyCode: z.string().trim().min(1),
});

/**
 * `companyFormSchema` から推論されるフォーム入力値の型。
 */
export type CompanyFormValues = z.infer<typeof companyFormSchema>;
