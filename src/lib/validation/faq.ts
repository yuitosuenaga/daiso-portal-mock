import { z } from "zod";

import { FAQ_CATEGORY_CODES } from "@/lib/constants/faq-options";

/**
 * FAQ新規作成・編集フォームの入力値を検証する zod スキーマ。
 * 入力は日本語（既定言語）の質問・回答とカテゴリのみ。他言語は保存時にサーバー側で自動翻訳する。
 */
export const faqFormSchema = z.object({
  category: z.enum(FAQ_CATEGORY_CODES),
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

/** `faqFormSchema`から推論されるフォーム入力値の型。 */
export type FaqFormValues = z.input<typeof faqFormSchema>;

/** `faqFormSchema`の検証後の型。 */
export type FaqSubmitValues = z.output<typeof faqFormSchema>;
