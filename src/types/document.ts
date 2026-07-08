// ドキュメント共有機能のドメイン型定義（フェーズ1の仮定義）。
// PDFのみを対象とし、実ファイルストレージが無いためBase64データURLとして本体を保持する。

/**
 * ドキュメントの公開範囲。全社共通公開、特定の国（ISO 3166-1 alpha-2）を1件以上指定、
 * または特定の販社を1件以上指定するかを判別可能なユニオン型で表す。
 */
export type DocumentTargeting =
  | { scope: "all" }
  | { scope: "countries"; countries: string[] }
  | { scope: "companies"; companyCodes: string[] };

export interface Document {
  id: string;
  title: string;
  /** 補足説明（任意項目） */
  description?: string;
  fileName: string;
  /** フェーズ1はPDF固定値 */
  fileType: "application/pdf";
  /** バイト数（Base64変換前の実ファイルサイズ） */
  fileSize: number;
  /** `FileReader.readAsDataURL`で生成したBase64データURL文字列 */
  dataUrl: string;
  targeting: DocumentTargeting;
  /** ISO 8601 形式のアップロード時刻。編集しても更新しない */
  uploadedAt: string;
}

/**
 * ドキュメント新規作成・編集時のAPI入力契約。
 * `Document`から`id`（API側で生成）と`uploadedAt`（保存時刻を採番）を除いたサブセット。
 */
export type CreateDocumentInput = Omit<Document, "id" | "uploadedAt">;
