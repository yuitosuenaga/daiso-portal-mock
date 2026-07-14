import { z } from "zod";

import { FAQ_CATEGORY_CODES } from "@/lib/constants/faq-options";

/**
 * FAQ新規作成・編集フォームの入力値を検証する zod スキーマ。
 * 質問・回答・カテゴリをすべて必須とし、空文字列・空白のみの入力を拒否する。
 */
export const faqFormSchema = z.object({
  category: z.enum(FAQ_CATEGORY_CODES),
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

/**
 * `faqFormSchema` から推論されるフォーム入力値の型。
 */
export type FaqFormValues = z.infer<typeof faqFormSchema>;
