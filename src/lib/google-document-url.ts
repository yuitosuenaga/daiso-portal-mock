/**
 * Googleドキュメント/スプレッドシート/スライドの共有リンクURLを判定し、iframe埋め込み用の
 * プレビューURLへ変換する純粋関数。DOM・ネットワークアクセスは行わない。`documents-management`
 * spec所有。
 */

export type GoogleDocumentKind = "document" | "spreadsheets" | "presentation";

export interface ParsedGoogleDocumentUrl {
  kind: GoogleDocumentKind;
  fileId: string;
}

const GOOGLE_DOCUMENT_URL_PATTERN =
  /^https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/;

/**
 * Googleドキュメント/スプレッドシート/スライドの共有リンクURLから種別とファイルIDを抽出する。
 * 一致しない場合は`null`を返す（例外は投げない）。
 */
export function parseGoogleDocumentUrl(
  url: string
): ParsedGoogleDocumentUrl | null {
  const match = GOOGLE_DOCUMENT_URL_PATTERN.exec(url.trim());
  if (!match) return null;

  return { kind: match[1] as GoogleDocumentKind, fileId: match[2] };
}

/**
 * Googleドキュメント/スプレッドシート/スライドの共有リンクURLを、iframe埋め込み用の
 * プレビューURL（`{種別}/d/{ファイルID}/preview`）へ変換する。無効なURLには`null`を返す。
 */
export function toGoogleEmbedUrl(url: string): string | null {
  const parsed = parseGoogleDocumentUrl(url);
  if (!parsed) return null;

  return `https://docs.google.com/${parsed.kind}/d/${parsed.fileId}/preview`;
}
