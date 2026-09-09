// マニュアル専用画面のドメイン型定義。`documents`specの`Document`型と構造は近いが、
// カテゴリが大分類/中分類のマスタではなく固定enum、かつ対象年月（year/month）を持つ点が異なる
// ため、型としては独立させる（`monthly-material`specの`MonthlyMaterial`と`document`の
// ハイブリッド）。アップロード方式はPDFのみを対象とし、実ファイルストレージが無いため
// Base64データURLとして本体を保持する。Google方式はGoogleドキュメント/スプレッドシート/
// スライドの共有リンクを保持し、実体のコピーは持たない。

/** マニュアルの大分類カテゴリ。固定10種類（`manual-mapper.ts`のPrisma enumと対応）。 */
export type ManualCategory =
  | "storeOperations"
  | "registerPayment"
  | "inventoryOrdering"
  | "salesFloorDisplay"
  | "promotion"
  | "safetyHygiene"
  | "hrTraining"
  | "systemOperation"
  | "accounting"
  | "other";

/**
 * マニュアルの公開範囲。全社共通公開、特定の国（ISO 3166-1 alpha-2）を1件以上指定、
 * または特定の販社を1件以上指定するかを判別可能なユニオン型で表す
 * （`documents`specの`DocumentTargeting`と構造は同一だが、型としては独立させる）。
 */
export type ManualTargeting =
  | { scope: "all" }
  | { scope: "countries"; countries: string[] }
  | { scope: "companies"; companyCodes: string[] };

/** マニュアルのタイトル・説明の言語別（`ja`以外）の内容。`ja`は親の`title`/`description`が正。 */
export interface ManualTranslationView {
  locale: string;
  title: string;
  description?: string;
}

interface ManualBase {
  id: string;
  title: string;
  /** 補足説明（任意項目） */
  description?: string;
  category: ManualCategory;
  /** 西暦年 */
  year: number;
  /** 1〜12 */
  month: number;
  targeting: ManualTargeting;
  /** ja以外の言語別タイトル・説明（jaは親のtitle/descriptionが正）。ja/enの2言語のみ対応。 */
  translations: ManualTranslationView[];
  createdAt: string;
  updatedAt: string;
}

export type Manual =
  | (ManualBase & {
      sourceType: "upload";
      fileName: string;
      /** フェーズ1はPDF固定値 */
      fileType: "application/pdf";
      /** バイト数（Base64変換前の実ファイルサイズ） */
      fileSize: number;
      /** `FileReader.readAsDataURL`で生成したBase64データURL文字列 */
      dataUrl: string;
    })
  | (ManualBase & {
      sourceType: "google";
      /** ヘルプデスク担当者が入力した元のGoogleドキュメント共有リンク */
      googleUrl: string;
      /** `googleUrl`から変換したiframe埋め込み用URL（サーバー側で再計算して保存） */
      googleEmbedUrl: string;
    });

/**
 * マニュアル新規作成・編集時のAPI入力契約。
 * `Manual`から`id`（API側で生成）・`createdAt`・`updatedAt`（保存時刻を採番）を除いたサブセット。
 */
export type CreateManualInput =
  | Omit<Extract<Manual, { sourceType: "upload" }>, "id" | "createdAt" | "updatedAt">
  | Omit<Extract<Manual, { sourceType: "google" }>, "id" | "createdAt" | "updatedAt">;
