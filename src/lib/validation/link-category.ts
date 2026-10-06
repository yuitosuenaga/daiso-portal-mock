import { z } from "zod";
import { TEXT_LIMITS } from "@/lib/constants/text-limits";

/**
 * カテゴリの追加・編集フォームの入力値を検証する zod スキーマ。
 * 入力は日本語（`ja`）の名称のみ。他言語は保存時に自動翻訳でサーバー側が補完する。
 */
export const linkCategoryFormSchema = z.object({
  /** null=大分類として作成、非null=当該大分類配下の中分類として作成 */
  parentId: z.string().trim().min(1).nullable(),
  name: z.string().trim().min(1).max(TEXT_LIMITS.categoryName),
});

/** `linkCategoryFormSchema` から推論されるフォーム入力値の型（変換前・`z.input`）。 */
export type LinkCategoryFormValues = z.input<typeof linkCategoryFormSchema>;

/** `linkCategoryFormSchema`のバリデーション・変換後（送信時）の型（`z.output`）。 */
export type LinkCategorySubmitValues = z.output<typeof linkCategoryFormSchema>;
