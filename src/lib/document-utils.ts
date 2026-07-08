import {
  DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/constants/document";

export type DocumentFileValidationResult =
  | { valid: true }
  | { valid: false; reason: "size" | "type" };

/**
 * ドキュメントとしてアップロードするファイルの形式・サイズを検証する。
 * 1ドキュメント=1PDFの1対1関係のため、`inquiry-form`の`validateAttachmentFile`と異なり
 * 件数チェックは行わない。
 */
export function validateDocumentFile(file: File): DocumentFileValidationResult {
  if (
    !DOCUMENT_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof DOCUMENT_ALLOWED_MIME_TYPES)[number]
    )
  ) {
    return { valid: false, reason: "type" };
  }
  if (file.size > DOCUMENT_MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: "size" };
  }
  return { valid: true };
}
