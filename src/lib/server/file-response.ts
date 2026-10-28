import "server-only";

import { errorFields, logger } from "@/lib/server/logger";

const PDF_DATA_URL_PREFIX = /^data:application\/pdf(;[^,]*)?;base64,/;
const FALLBACK_FILE_NAME = "document.pdf";
const CHUNK_SIZE = 256 * 1024;

/**
 * `data:application/pdf;base64,...`だけをBufferに復元する。PDF以外のMIME・base64でない形式は
 * null（DB上の値が改ざん・誤登録されていても、PDF以外をそのまま配信しない）。
 */
export function parsePdfDataUrl(dataUrl: string): Buffer | null {
  const match = PDF_DATA_URL_PREFIX.exec(dataUrl);
  if (!match) {
    return null;
  }
  return Buffer.from(dataUrl.slice(match[0].length), "base64");
}

function sanitizeFileName(fileName: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = fileName.replace(/[\u0000-\u001f\u007f"\\]/g, "").trim();
  return cleaned === "" ? FALLBACK_FILE_NAME : cleaned;
}

function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/**
 * Content-Dispositionを組み立てる。CR/LF・制御文字・`"`・`\`は除去し（ヘッダーインジェクション対策）、
 * ASCIIフォールバックの`filename`とRFC 5987の`filename*`（UTF-8）を併記する。
 */
export function buildContentDisposition(type: "inline" | "attachment", fileName: string): string {
  const safe = sanitizeFileName(fileName);
  const ascii = safe.replace(/[^\x20-\x7e]/gu, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeRfc5987(safe)}`;
}

/**
 * 同時にメモリへ保持するPDF本体の数を制限する小さなin-processセマフォ。
 * 1件最大約20MiBのBufferを多数同時に保持してCloud Run（512Mi）がOOMになるのを避ける。
 */
const MAX_CONCURRENT_FILES = 2;
let activeFiles = 0;
const waiters: (() => void)[] = [];

function acquire(): Promise<void> {
  if (activeFiles < MAX_CONCURRENT_FILES) {
    activeFiles += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiters.push(resolve));
}

function release(): void {
  const next = waiters.shift();
  if (next) {
    // 許可を待機中の呼び出しへ引き渡す（activeFilesは変えない）
    next();
    return;
  }
  activeFiles -= 1;
}

function bufferToStream(buffer: Buffer, onDone: () => void): ReadableStream<Uint8Array> {
  let offset = 0;
  let done = false;
  const finish = () => {
    if (!done) {
      done = true;
      onDone();
    }
  };
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= buffer.length) {
        controller.close();
        finish();
        return;
      }
      const end = Math.min(offset + CHUNK_SIZE, buffer.length);
      controller.enqueue(new Uint8Array(buffer.buffer, buffer.byteOffset + offset, end - offset));
      offset = end;
    },
    cancel() {
      finish();
    },
  });
}

/**
 * DBのdataUrlからPDF配信レスポンスを作る。Content-Typeは固定で`application/pdf`
 * （DBのfileTypeは使わない）、`nosniff`・`private, no-store`を付ける。dataUrlが
 * PDFとして不正な場合は404（整合性エラーとしてログに残す）。
 * 本体を保持している間はセマフォの許可を1つ消費し、ボディの送信完了・中断で解放する。
 */
export async function pdfFileResponse(
  file: { fileName: string; dataUrl: string },
  options: { download: boolean }
): Promise<Response> {
  await acquire();
  let released = false;
  const releaseOnce = () => {
    if (!released) {
      released = true;
      release();
    }
  };

  try {
    const buffer = parsePdfDataUrl(file.dataUrl);
    if (!buffer) {
      logger.error("document file integrity error: dataUrl is not a base64 PDF", {
        fileName: file.fileName,
      });
      releaseOnce();
      return Response.json({ error: "Not Found" }, { status: 404 });
    }

    return new Response(bufferToStream(buffer, releaseOnce), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(buffer.length),
        "Content-Disposition": buildContentDisposition(
          options.download ? "attachment" : "inline",
          file.fileName
        ),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    releaseOnce();
    logger.error("document file response failed", errorFields(error));
    throw error;
  }
}
