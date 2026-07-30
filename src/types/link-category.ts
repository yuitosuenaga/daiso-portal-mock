// リンクカテゴリ（大分類・中分類の2階層）のドメイン型定義。
// documents-managementのDocumentCategoryと同型の階層構造だが、公開範囲（targeting）は持たない
// （既存links-management要件のスコープ外方針を維持するため）。

/** カテゴリ名の言語別（`ja`以外）の内容。`ja`は親の`name`が正。 */
export interface LinkCategoryTranslationView {
  locale: string;
  name: string;
}

/** カテゴリ1件。`parentId === null`が大分類、非nullが中分類。`name`は既定言語（ja）。 */
export interface LinkCategory {
  id: string;
  parentId: string | null;
  name: string;
  displayOrder: number;
  translations: LinkCategoryTranslationView[];
}

/** ヘルプデスク側カテゴリ管理画面用。削除可否の表示判定に必要な件数を同梱する。 */
export interface LinkCategoryAdminView extends LinkCategory {
  /** 当該カテゴリに直接紐づくリンク件数 */
  linkCount: number;
  /** 大分類のときのみ意味を持つ配下の中分類（displayOrder昇順） */
  children: LinkCategoryAdminChildView[];
}

export interface LinkCategoryAdminChildView extends LinkCategory {
  linkCount: number;
}

/** カテゴリの作成入力。`displayOrder`はサービス層が同一階層の末尾へ自動採番する。 */
export interface CreateLinkCategoryInput {
  /** null=大分類として作成、非null=当該大分類配下の中分類として作成 */
  parentId: string | null;
  /** 既定言語（ja）の名称 */
  name: string;
  /** `en`必須＋任意の追加言語。`ja`行は含まない */
  translations: LinkCategoryTranslationView[];
}

/** カテゴリの更新入力。所属大分類の付け替えは対象外のため`parentId`を含まない。 */
export type UpdateLinkCategoryInput = Omit<CreateLinkCategoryInput, "parentId">;

export type LinkCategoryMoveDirection = "up" | "down";

/** 申請者側`/links`のグループ表示・プレビュー用の中分類（`name`はlocale解決済み）。 */
export interface LinkSubCategorySummary {
  id: string;
  name: string;
  displayOrder: number;
}

/**
 * 申請者側`/links`のグループ表示・プレビュー用の大分類（`name`・配下`subCategories`の
 * `name`はlocale解決済み）。中分類名の解決を呼び出し側（`links-page`spec）で行わずに
 * 済むよう、大分類・中分類の名前をこの型を返す関数内で解決済みの状態にする。
 */
export interface LinkCategorySummary {
  id: string;
  name: string;
  displayOrder: number;
  /** 配下の中分類（displayOrder昇順、name解決済み） */
  subCategories: LinkSubCategorySummary[];
}
