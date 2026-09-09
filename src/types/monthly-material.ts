// 月次資料ギャラリー（売場検討会資料・POP資料）のドメイン型定義。
// `documents`/`documents-management`specの`Document`型とは独立させる
// （`monthly-document-gallery`spec所有）。タイトル・説明・多言語翻訳は持たず、
// 見出しは`year`/`month`から画面側で動的生成する。

/** 対象カテゴリ。売場検討会資料とPOP資料は構造が同一だが、データとしては互いに独立する。 */
export type MonthlyMaterialCategory = "salesFloorMeeting" | "pop";

/**
 * 資料の売場（商品部門）カテゴリ。`category`（salesFloorMeeting/pop=資料種別・画面）とは
 * 並列な第2軸で、画面内の検索・絞り込みに使う。ヒアリング結果で見直す前提の仮値。
 */
export type MonthlyMaterialDepartment =
  | "seasonalEvent"
  | "storage"
  | "kitchen"
  | "cleaning"
  | "beautyHealth"
  | "stationery"
  | "interior"
  | "craftDiy"
  | "food"
  | "other";

/**
 * 資料の公開範囲。全社共通公開、特定の国（ISO 3166-1 alpha-2）を1件以上指定、
 * または特定の販社を1件以上指定するかを判別可能なユニオン型で表す。
 * `documents`specの`DocumentTargeting`と構造は同一だが、型としては独立させる。
 */
export type MonthlyMaterialTargeting =
  | { scope: "all" }
  | { scope: "countries"; countries: string[] }
  | { scope: "companies"; companyCodes: string[] };

interface MonthlyMaterialBase {
  id: string;
  category: MonthlyMaterialCategory;
  department: MonthlyMaterialDepartment;
  /** 西暦年 */
  year: number;
  /** 1〜12 */
  month: number;
  targeting: MonthlyMaterialTargeting;
  createdAt: string;
  updatedAt: string;
}

export type MonthlyMaterial =
  | (MonthlyMaterialBase & {
      sourceType: "upload";
      fileName: string;
      /** フェーズ1はPDF固定値 */
      fileType: "application/pdf";
      /** バイト数（Base64変換前の実ファイルサイズ） */
      fileSize: number;
      /** `FileReader.readAsDataURL`で生成したBase64データURL文字列 */
      dataUrl: string;
    })
  | (MonthlyMaterialBase & {
      sourceType: "google";
      /** ヘルプデスク担当者が入力した元のGoogleドキュメント共有リンク */
      googleUrl: string;
      /** `googleUrl`から変換したiframe埋め込み用URL（サーバー側で再計算して保存） */
      googleEmbedUrl: string;
    });

/**
 * 資料新規作成・編集時のAPI入力契約。
 * `MonthlyMaterial`から`id`（API側で生成）・`createdAt`・`updatedAt`（保存時刻を採番）を除いたサブセット。
 */
export type CreateMonthlyMaterialInput =
  | Omit<Extract<MonthlyMaterial, { sourceType: "upload" }>, "id" | "createdAt" | "updatedAt">
  | Omit<Extract<MonthlyMaterial, { sourceType: "google" }>, "id" | "createdAt" | "updatedAt">;
