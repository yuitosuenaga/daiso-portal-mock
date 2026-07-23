// ドキュメント共有機能のドメイン型定義（フェーズ1の仮定義）。
// アップロード方式はPDFのみを対象とし、実ファイルストレージが無いためBase64データURLとして
// 本体を保持する。Google方式はGoogleドキュメント/スプレッドシート/スライドの共有リンクを
// 保持し、実体のコピーは持たない（Google側が都度最新のコンテンツを配信する）。

/**
 * ドキュメントの公開範囲。全社共通公開、特定の国（ISO 3166-1 alpha-2）を1件以上指定、
 * または特定の販社を1件以上指定するかを判別可能なユニオン型で表す。
 */
export type DocumentTargeting =
  | { scope: "all" }
  | { scope: "countries"; countries: string[] }
  | { scope: "companies"; companyCodes: string[] };

interface DocumentBase {
  id: string;
  title: string;
  /** 補足説明（任意項目） */
  description?: string;
  /** 公開状態。draft=下書き（申請者側に非表示）、published=公開 */
  status: "draft" | "published";
  targeting: DocumentTargeting;
  /** ISO 8601 形式のアップロード時刻。編集しても更新しない */
  uploadedAt: string;
}

export type Document =
  | (DocumentBase & {
      sourceType: "upload";
      fileName: string;
      /** フェーズ1はPDF固定値 */
      fileType: "application/pdf";
      /** バイト数（Base64変換前の実ファイルサイズ） */
      fileSize: number;
      /** `FileReader.readAsDataURL`で生成したBase64データURL文字列 */
      dataUrl: string;
    })
  | (DocumentBase & {
      sourceType: "google";
      /** ヘルプデスク担当者が入力した元のGoogleドキュメント共有リンク */
      googleUrl: string;
      /** `googleUrl`から変換したiframe埋め込み用URL（サーバー側で再計算して保存） */
      googleEmbedUrl: string;
    });

/**
 * ドキュメント新規作成・編集時のAPI入力契約。
 * `Document`から`id`（API側で生成）と`uploadedAt`（保存時刻を採番）を除いたサブセット。
 */
export type CreateDocumentInput =
  | Omit<Extract<Document, { sourceType: "upload" }>, "id" | "uploadedAt">
  | Omit<Extract<Document, { sourceType: "google" }>, "id" | "uploadedAt">;
