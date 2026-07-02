import { z } from "zod";

import { INQUIRY_CATEGORY_CODES } from "@/lib/constants/inquiry-options";

/**
 * テンプレート新規作成・編集フォームの入力値を検証する zod スキーマ。
 * カテゴリ・本文の両方を必須とし、空文字列・空白のみの本文を拒否する。
 */
export const replyTemplateFormSchema = z.object({
  category: z.enum(INQUIRY_CATEGORY_CODES),
  body: z.string().trim().min(1),
});

/**
 * `replyTemplateFormSchema` から推論されるフォーム入力値の型。
 */
export type ReplyTemplateFormValues = z.infer<typeof replyTemplateFormSchema>;
