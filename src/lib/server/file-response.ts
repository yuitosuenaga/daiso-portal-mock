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
 * 許可が何らかの理由（ボディが読まれない・cancelされない等）で戻らなくても配信全体が止まらないよう、
 * 待ち時間のタイムアウト（503）と最大保持時間での強制解放を保険として持つ。
 */
const MAX_CONCURRENT_FILES = 2;
export const ACQUIRE_TIMEOUT_MS = 30_000;
export const MAX_HOLD_MS = 3 * 60_000;

export class FileBusyError extends Error {
  constructor() {
    super("File delivery is busy");
    this.name = "FileBusyError";
  }
}

let activeFiles = 0;
const waiters: { grant: () => void }[] = [];

/** 許可を取得し、解放関数を返す。解放関数は何度呼んでも1回だけ有効（最大保持時間で自動解放も行う）。 */
function acquire(): Promise<() => void> {
  const makeRelease = () => {
    let released = false;
    const timer = setTimeout(() => releaseOnce(), MAX_HOLD_MS);
    timer.unref?.();
    const releaseOnce = () => {
      if (released) {
        return;
      }
      released = true;
      clearTimeout(timer);
      release();
    };
    return releaseOnce;
  };

  if (activeFiles < MAX_CONCURRENT_FILES) {
    activeFiles += 1;
    return Promise.resolve(makeRelease());
  }
  return new Promise((resolve, reject) => {
    const waiter = {
      grant: () => {
        clearTimeout(waitTimer);
        resolve(makeRelease());
      },
    };
    const waitTimer = setTimeout(() => {
      const index = waiters.indexOf(waiter);
      if (index >= 0) {
        waiters.splice(index, 1);
      }
      reject(new FileBusyError());
    }, ACQUIRE_TIMEOUT_MS);
    waitTimer.unref?.();
    waiters.push(waiter);
  });
}

function release(): void {
  const next = waiters.shift();
  if (next) {
    // 許可を待機中の呼び出しへ引き渡す（activeFilesは変えない）
    next.grant();
    return;
  }
  activeFiles -= 1;
}

const NO_STORE = "private, no-store";

/** ファイル配信ルートのエラー（401/404/503等）にCache-Controlを付ける。 */
export function withNoStore<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", NO_STORE);
  return response;
}

function fileHeaders(
  length: number,
  fileName: string,
  options: { download: boolean }
): Record<string, string> {
  return {
    "Content-Type": "application/pdf",
    "Content-Length": String(length),
    "Content-Disposition": buildContentDisposition(
      options.download ? "attachment" : "inline",
      fileName
    ),
    "Cache-Control": NO_STORE,
    "X-Content-Type-Options": "nosniff",
  };
}

/**
 * HEAD用。本体を保持・配信しないためセマフォは使わず、ヘッダーだけ返す（GETと同じヘッダー）。
 * dataUrlがPDFとして不正な場合は404。
 */
export function pdfFileHeadResponse(
  file: { fileName: string; dataUrl: string },
  options: { download: boolean }
): Response {
  const match = PDF_DATA_URL_PREFIX.exec(file.dataUrl);
  if (!match) {
    logger.error("document file integrity error: dataUrl is not a base64 PDF", {
      fileName: file.fileName,
    });
    return withNoStore(Response.json({ error: "Not Found" }, { status: 404 }));
  }
  // 改行入りbase64でもGETのBuffer.fromと同じ長さになるよう、base64の文字以外（改行・空白）は数えない
  const payload = file.dataUrl.slice(match[0].length).replace(/[^A-Za-z0-9+/=_-]/g, "");
  const length = Buffer.byteLength(payload, "base64");
  return new Response(null, { status: 200, headers: fileHeaders(length, file.fileName, options) });
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
 * 本体を保持している間はセマフォの許可を1つ消費し、ボディの送信完了・中断で解放する
 * （保険として最大保持時間でも解放）。許可待ちが長引いた場合は503。
 */
export async function pdfFileResponse(
  file: { fileName: string; dataUrl: string },
  options: { download: boolean }
): Promise<Response> {
  let releaseOnce: () => void;
  try {
    releaseOnce = await acquire();
  } catch (error) {
    if (error instanceof FileBusyError) {
      logger.warn("document file delivery busy: acquire timed out", {});
      return withNoStore(Response.json({ error: "Service Unavailable" }, { status: 503 }));
    }
    throw error;
  }

  try {
    const buffer = parsePdfDataUrl(file.dataUrl);
    if (!buffer) {
      logger.error("document file integrity error: dataUrl is not a base64 PDF", {
        fileName: file.fileName,
      });
      releaseOnce();
      return withNoStore(Response.json({ error: "Not Found" }, { status: 404 }));
    }

    return new Response(bufferToStream(buffer, releaseOnce), {
      status: 200,
      headers: fileHeaders(buffer.length, file.fileName, options),
    });
  } catch (error) {
    releaseOnce();
    logger.error("document file response failed", errorFields(error));
    throw error;
  }
}
