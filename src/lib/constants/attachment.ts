/**
 * 添付ファイルの上限値。`inquiry-form`spec所有。
 * `helpdesk-inquiry-management`（返信の添付）が読み取り専用の依存として再利用する。
 */

/** 添付ファイル1件あたりの最大サイズ（バイト）。5MB。 */
export const ATTACHMENT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** 1回の送信あたりの最大添付ファイル件数。 */
export const ATTACHMENT_MAX_COUNT = 5;

/** 添付を許可するMIMEタイプ（画像・PDF）。 */
export const ATTACHMENT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;
