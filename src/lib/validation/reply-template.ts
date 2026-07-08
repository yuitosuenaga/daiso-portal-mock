import { z } from "zod";

import { INQUIRY_CATEGORY_CODES } from "@/lib/constants/inquiry-options";

/**
 * テンプレート名の最大文字数。一覧見出しやテンプレート選択肢のラベルとして
 * 表示するため、本文のような長文にならないよう上限を設ける。
 */
export const TEMPLATE_NAME_MAX_LENGTH = 40;

/**
 * テンプレート新規作成・編集フォームの入力値を検証する zod スキーマ。
 * カテゴリ・テンプレート名・本文をすべて必須とし、空文字列・空白のみの入力を拒否する。
 */
export const replyTemplateFormSchema = z.object({
  category: z.enum(INQUIRY_CATEGORY_CODES),
  name: z.string().trim().min(1).max(TEMPLATE_NAME_MAX_LENGTH),
  body: z.string().trim().min(1),
});

/**
 * `replyTemplateFormSchema` から推論されるフォーム入力値の型。
 */
export type ReplyTemplateFormValues = z.infer<typeof replyTemplateFormSchema>;
