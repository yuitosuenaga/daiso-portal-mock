import {
  ATTACHMENT_ALLOWED_MIME_TYPES,
  ATTACHMENT_MAX_COUNT,
  ATTACHMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/attachment";

export type AttachmentValidationResult =
  | { valid: true }
  | { valid: false; reason: "size" | "type" | "count" };

/**
 * 添付ファイルの件数・形式・サイズを検証する。
 * `existingCount` は既に選択済みの添付ファイル件数（このファイルを含まない）。
 */
export function validateAttachmentFile(
  file: File,
  existingCount: number
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
