import type { Inquiry } from "@/types/inquiry";

/** 返信テンプレートの名称・本文を`ja`以外の言語で表す1件分。 */
export type ReplyTemplateTranslationView = {
  locale: string;
  name: string;
  body: string;
};

/**
 * カテゴリ別の返信テンプレート（フェーズ1の仮定義）。
 */
export type ReplyTemplate = {
  id: string;
  category: Inquiry["category"];
  /** 日本語（既定言語）の名称。 */
  name: string;
  /** 日本語（既定言語）の本文。 */
  body: string;
  /**
   * ja以外の言語別名称・本文（jaは親のname/bodyが正）。サービス層のmapperは常に配列を返すが、
   * 翻訳を持たない既存の呼び出し側（表示専用のモック等）との後方互換のため型は任意とする。
   */
  translations?: ReplyTemplateTranslationView[];
};

/**
 * テンプレート作成・編集時のAPI入力契約。
 * `ReplyTemplate` から `id`（API側で生成）を除いたサブセットで、`translations`は任意。
 * 更新時に`translations`を省略すると既存の翻訳行は変更されない。指定すると全置換する。
 */
export type CreateReplyTemplateInput = Omit<ReplyTemplate, "id" | "translations"> & {
  translations?: ReplyTemplateTranslationView[];
};
