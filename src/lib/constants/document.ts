/**
 * ドキュメント共有機能のファイル検証定数。`documents-management`spec所有。
 */

/** ドキュメント1件（PDF）あたりの最大サイズ（バイト）。20MB。 */
export const DOCUMENT_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/** アップロードを許可するファイル形式（PDFのみ）。 */
export const DOCUMENT_ALLOWED_MIME_TYPES = ["application/pdf"] as const;
