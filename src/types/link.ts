// リンク集機能のドメイン型定義。
// カテゴリ（大分類・中分類）は`@/types/link-category`が所有する`LinkCategory`階層モデルを参照する
// （2026-07-29改訂: 固定4値enumから、ヘルプデスク担当者が管理画面で追加・編集できる
// 階層カテゴリへ変更した。旧`LinkCategory`型（固定4値union）は撤去した）。

export interface Link {
  id: string;
  title: string;
  url: string;
  /** 大分類ID。カテゴリ未設定の既存リンクはnull（要件12.4） */
  categoryId: string | null;
  /** 中分類ID。未設定を許容（要件12.7）。非nullのとき必ずcategoryIdの配下 */
  subCategoryId: string | null;
  /** 補足説明（フェーズ1は任意項目） */
  description?: string;
}

/**
 * リンク新規作成・編集時のAPI入力契約。
 * `Link`から`id`（API側で生成）を除いたサブセット。書き込み経路では大分類（`categoryId`）を
 * 必須とする（要件12.6。`Link`本体は既存リンクとの後方互換のためnull許容のまま）。
 * `subCategoryId`は未指定（`undefined`）＝中分類なしを許容する（zodスキーマの出力と揃えるため）。
 */
export type CreateLinkInput = Omit<Link, "id" | "categoryId" | "subCategoryId"> & {
  categoryId: string;
  subCategoryId?: string | null;
};

/**
 * 登録日（`createdAt`）を含む表示用のリンク型。
 * 申請者側一覧（新着バッジ・登録日表示）・ヘルプデスク側管理一覧の両方で使用する。
 * `Link`基底型は変更せず、表示専用にこの型を追加する。
 */
export interface LinkWithTimestamp extends Link {
  /** 登録日時（ISO文字列） */
  createdAt: string;
}
