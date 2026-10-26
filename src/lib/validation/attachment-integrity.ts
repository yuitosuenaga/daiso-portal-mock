import {
  ATTACHMENT_MAX_FILE_SIZE_BYTES,
  ATTACHMENT_MAX_TOTAL_SIZE_BYTES,
} from "@/lib/constants/attachment";

/**
 * 添付ファイル（dataUrl）の整合性をサーバー側で検証する共通関数。
 *
 * クライアントの自己申告（`fileSize`・`fileType`・`fileName`）を信用せず、dataUrl の
 * 実体（Base64 のデコード後サイズ・先頭のマジックバイト）と突き合わせる。
 * 問い合わせ作成・申請者メッセージ・ヘルプデスク返信の各経路（Server Action と JSON API）が
 * `inquiryAttachmentsStrictSchema` 経由で使う。
 */

export interface AttachmentIntegrityInput {
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string;
}

export type AttachmentIntegrityIssue =
  | "invalid_data_url"
  | "mime_mismatch"
  | "size_mismatch"
  | "size_exceeded"
  | "extension_mismatch"
  | "signature_mismatch"
  | "total_size_exceeded";

export type AttachmentIntegrityResult =
  | { ok: true; decodedSize: number }
  | { ok: false; issue: AttachmentIntegrityIssue };

const DATA_URL_PATTERN = /^data:([a-zA-Z0-9!#$&.+\-^_]+\/[a-zA-Z0-9!#$&.+\-^_]+);base64,/;
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

/** MIME ごとに許可するファイル拡張子（小文字、ドットなし）。 */
const EXTENSIONS_BY_MIME: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
};

/** 先頭バイト列がMIMEの形式と一致するかを判定する。 */
function matchesSignature(mime: string, head: Buffer): boolean {
  switch (mime) {
    case "image/jpeg":
      return head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "image/png":
      return (
        head.length >= 8 &&
        head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    case "image/gif": {
      const magic = head.subarray(0, 6).toString("latin1");
      return magic === "GIF87a" || magic === "GIF89a";
    }
    case "image/webp":
      return (
        head.length >= 12 &&
        head.subarray(0, 4).toString("latin1") === "RIFF" &&
        head.subarray(8, 12).toString("latin1") === "WEBP"
      );
    case "application/pdf":
      // 仕様上は先頭1024バイト以内に現れればよいが、ここでは先頭一致のみ許可する（厳格側）
      return head.length >= 5 && head.subarray(0, 5).toString("latin1") === "%PDF-";
    default:
      return false;
  }
}

/** 拡張子（小文字、ドットなし）。拡張子がなければ空文字。 */
function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  if (index < 0 || index === fileName.length - 1) return "";
  return fileName.slice(index + 1).toLowerCase();
}

/**
 * 1件の添付ファイルを検証する。デコード後の全バイト列は作らず、Base64 の長さから
 * 実サイズを算出し、先頭の数十バイトだけをデコードしてマジックバイトを確認する。
 */
export function verifyAttachmentIntegrity(
  attachment: AttachmentIntegrityInput
): AttachmentIntegrityResult {
  const { fileName, fileType, fileSize, dataUrl } = attachment;

  // Base64 本体は1件あたり上限の4/3倍＋パディングに収まる。巨大な文字列は正規表現にかける前に弾く
  const maxDataUrlLength =
    Math.ceil((ATTACHMENT_MAX_FILE_SIZE_BYTES * 4) / 3) + 4 + 128;
  if (dataUrl.length > maxDataUrlLength) {
    return { ok: false, issue: "size_exceeded" };
  }

  const prefix = DATA_URL_PATTERN.exec(dataUrl);
  if (!prefix) return { ok: false, issue: "invalid_data_url" };

  if (prefix[1].toLowerCase() !== fileType.toLowerCase()) {
    return { ok: false, issue: "mime_mismatch" };
  }

  const base64 = dataUrl.slice(prefix[0].length);
  if (base64.length === 0 || base64.length % 4 !== 0 || !BASE64_PATTERN.test(base64)) {
    return { ok: false, issue: "invalid_data_url" };
  }

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const decodedSize = (base64.length / 4) * 3 - padding;

  if (decodedSize > ATTACHMENT_MAX_FILE_SIZE_BYTES) {
    return { ok: false, issue: "size_exceeded" };
  }
  if (decodedSize !== fileSize) {
    return { ok: false, issue: "size_mismatch" };
  }

  const allowedExtensions = EXTENSIONS_BY_MIME[fileType.toLowerCase()];
  if (!allowedExtensions || !allowedExtensions.includes(extensionOf(fileName))) {
    return { ok: false, issue: "extension_mismatch" };
  }

  // 先頭16バイト分（Base64 で24文字）だけデコードする
  const head = Buffer.from(base64.slice(0, 24), "base64");
  if (!matchesSignature(fileType.toLowerCase(), head)) {
    return { ok: false, issue: "signature_mismatch" };
  }

  return { ok: true, decodedSize };
}

/**
 * 添付ファイル一覧を検証し、最初に見つかった問題を返す（問題なしなら `null`）。
 * 合計サイズ（デコード後）が `ATTACHMENT_MAX_TOTAL_SIZE_BYTES` を超える場合も弾く。
 */
export function findAttachmentsIntegrityIssue(
  attachments: readonly AttachmentIntegrityInput[]
): { index: number; issue: AttachmentIntegrityIssue } | null {
  let total = 0;
  for (let index = 0; index < attachments.length; index += 1) {
    const result = verifyAttachmentIntegrity(attachments[index]);
    if (!result.ok) return { index, issue: result.issue };
    total += result.decodedSize;
    if (total > ATTACHMENT_MAX_TOTAL_SIZE_BYTES) {
      return { index, issue: "total_size_exceeded" };
    }
  }
  return null;
}
