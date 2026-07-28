// ドキュメントカテゴリ（大分類・中分類の2階層）のドメイン型定義。
// 公開範囲は`types/document.ts`の`DocumentTargeting`を再利用し、二重定義しない。

import type { DocumentTargeting } from "@/types/document";

/** カテゴリ名の言語別（`ja`以外）の内容。`ja`は親の`name`が正。 */
export interface DocumentCategoryTranslationView {
  locale: string;
  name: string;
}

/** カテゴリ1件。`parentId === null`が大分類、非nullが中分類。`name`は既定言語（ja）。 */
export interface DocumentCategory {
  id: string;
  parentId: string | null;
  name: string;
  displayOrder: number;
  targeting: DocumentTargeting;
  translations: DocumentCategoryTranslationView[];
}

/** ヘルプデスク側カテゴリ管理画面用。削除可否の表示判定に必要な件数を同梱する。 */
export interface DocumentCategoryAdminView extends DocumentCategory {
  /** 当該カテゴリに直接紐づくドキュメント件数（下書きを含み、公開範囲で絞らない） */
  documentCount: number;
  /** 大分類のときのみ意味を持つ配下の中分類（displayOrder昇順） */
  children: DocumentCategoryAdminChildView[];
}

export interface DocumentCategoryAdminChildView extends DocumentCategory {
  documentCount: number;
}

/** カテゴリの作成入力。`displayOrder`はサービス層が同一階層の末尾へ自動採番する。 */
export interface CreateDocumentCategoryInput {
  /** null=大分類として作成、非null=当該大分類配下の中分類として作成 */
  parentId: string | null;
  /** 既定言語（ja）の名称 */
  name: string;
  targeting: DocumentTargeting;
  /** `en`必須＋任意の追加言語。`ja`行は含まない */
  translations: DocumentCategoryTranslationView[];
}

/** カテゴリの更新入力。所属大分類の付け替えは対象外のため`parentId`を含まない。 */
export type UpdateDocumentCategoryInput = Omit<CreateDocumentCategoryInput, "parentId">;

export type DocumentCategoryMoveDirection = "up" | "down";

/** 申請者側トップページの大分類カード用（`name`はlocale解決済み）。 */
export interface DocumentCategorySummary {
  id: string;
  name: string;
  /** 自社に公開された公開済みドキュメントの件数（要件20.4） */
  documentCount: number;
}

/** 申請者側の大分類配下一覧用（`name`はlocale解決済み）。 */
export interface DocumentCategoryDetail {
  id: string;
  name: string;
  /** 自社に公開されている中分類のみ（displayOrder昇順、要件21.5） */
  subCategories: DocumentSubCategoryOption[];
}

export interface DocumentSubCategoryOption {
  id: string;
  name: string;
}
