import type { Inquiry } from "@/types/inquiry";

/**
 * カテゴリ別の返信テンプレート（フェーズ1の仮定義）。
 */
export type ReplyTemplate = {
  id: string;
  category: Inquiry["category"];
  body: string;
};

/**
 * テンプレート作成・編集時のAPI入力契約。
 * `ReplyTemplate` から `id`（API側で生成）を除いたサブセット。
 */
export type CreateReplyTemplateInput = Omit<ReplyTemplate, "id">;
