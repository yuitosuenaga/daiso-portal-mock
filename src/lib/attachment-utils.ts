import {
  ATTACHMENT_ALLOWED_MIME_TYPES,
  ATTACHMENT_MAX_COUNT,
  ATTACHMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/attachment";

export type AttachmentValidationResult =
  | { valid: true }
  | { valid: false; reason: "size" | "type" | "count" | "total" };

/**
 * 添付ファイルの件数・形式・サイズを検証する。
 * `existingCount` は既に選択済みの添付ファイル件数（このファイルを含まない）。
 * `totalLimit` を渡すと、既選択分のバイト数（`existingTotalBytes`）との合計も検証する
 * （省略時は合計チェックなし。お知らせ等の共用側の挙動を変えないため）。
 */
export function validateAttachmentFile(
  file: File,
  existingCount: number,
  totalLimit?: { existingTotalBytes: number; maxTotalBytes: number }
): AttachmentValidationResult {
  if (existingCount >= ATTACHMENT_MAX_COUNT) {
    return { valid: false, reason: "count" };
  }
  if (
    !ATTACHMENT_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ATTACHMENT_ALLOWED_MIME_TYPES)[number]
    )
  ) {
    return { valid: false, reason: "type" };
  }
  if (file.size > ATTACHMENT_MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: "size" };
  }
  if (
    totalLimit &&
    totalLimit.existingTotalBytes + file.size > totalLimit.maxTotalBytes
  ) {
    return { valid: false, reason: "total" };
  }
  return { valid: true };
}

/**
 * ファイルの内容をBase64データURL文字列として読み取る。
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * バイト数を人が読みやすい単位（B/KB/MB）の文字列に変換する。
 * `helpdesk-inquiry-management`spec（`AttachmentPreviewList`）が読み取り専用で再利用する。
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
