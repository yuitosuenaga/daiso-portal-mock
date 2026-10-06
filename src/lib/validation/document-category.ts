import { z } from "zod";

import { documentTargetingSchema } from "@/lib/validation/document";
import { TEXT_LIMITS } from "@/lib/constants/text-limits";

/**
 * カテゴリの追加・編集フォームの入力値を検証する zod スキーマ。名称は日本語（`ja`）のみを
 * 入力し、他言語の翻訳はServer Action側で`autoTranslateFields`により自動生成して保存する。
 */
export const documentCategoryFormSchema = z.object({
  /** null=大分類として作成、非null=当該大分類配下の中分類として作成 */
  parentId: z.string().trim().min(1).nullable(),
  name: z.string().trim().min(1).max(TEXT_LIMITS.categoryName),
  targeting: documentTargetingSchema,
});

/**
 * `documentCategoryFormSchema` から推論されるフォーム入力値の型（変換前・`z.input`）。
 * `useForm`の入力型として使用する（`DocumentFormValues`と同型）。
 */
export type DocumentCategoryFormValues = z.input<typeof documentCategoryFormSchema>;

/**
 * `documentCategoryFormSchema`のバリデーション・変換後（送信時）の型（`z.output`）。
 */
export type DocumentCategorySubmitValues = z.output<typeof documentCategoryFormSchema>;
