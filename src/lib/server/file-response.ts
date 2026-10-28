import "server-only";

import { errorFields, logger } from "@/lib/server/logger";

// HEAD（DB側で先頭300文字だけ取って判定）とGET（dataUrl全体に対して判定）でプレフィックス判定の
// 範囲が異なる。`;[^,]*`が300文字を超える異常なdataUrlでは、HEADが404・GETが200になり得る
// （DBに異常データがある場合のみ。挙動は変えない）。
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
 * 1件最大約20MiBのBufferを多数同時に保持してCloud RunがOOMになるのを避ける。
 * 当初は512Mi想定で同時2件に制限したが、実測（GET 50並列でRSS約0.6GB→約1.15GB）では512Miを超える。
 * そのためTerraformのcloudrun_memoryを1Giにする対応（#205、applyはユーザー操作）を行った。
 * GCS移行までメモリを1GiB未満に戻さない。
 * 許可が何らかの理由（ボディが読まれない・cancelされない等）で戻らなくても配信全体が止まらないよう、
 * 待ち時間のタイムアウト（503）と最大保持時間での強制解放を保険として持つ。
 */
const MAX_CONCURRENT_FILES = 2;
/** HEADのDB側集計（`replace`で全文を走査する）を同時に走らせる上限。DBのCPUとPrismaの接続を占有させない。 */
const MAX_CONCURRENT_HEAD_STATS = 3;
export const ACQUIRE_TIMEOUT_MS = 30_000;
export const HEAD_ACQUIRE_TIMEOUT_MS = 15_000;
export const MAX_HOLD_MS = 3 * 60_000;

export class FileBusyError extends Error {
  constructor() {
    super("File delivery is busy");
    this.name = "FileBusyError";
  }
}

/** 同時保持数を制限するin-processセマフォ。`acquire`は解放関数（何度呼んでも1回だけ有効）を返す。 */
function createSemaphore(max: number, acquireTimeoutMs: number) {
  let active = 0;
  const waiters: { grant: () => void }[] = [];

  function release(): void {
    const next = waiters.shift();
    if (next) {
      // 許可を待機中の呼び出しへ引き渡す（activeは変えない）
      next.grant();
      return;
    }
    active -= 1;
  }

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

  return function acquire(): Promise<() => void> {
    if (active < max) {
      active += 1;
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
      }, acquireTimeoutMs);
      waitTimer.unref?.();
      waiters.push(waiter);
    });
  };
}

const acquire = createSemaphore(MAX_CONCURRENT_FILES, ACQUIRE_TIMEOUT_MS);
// ファイル本体用とは別カウンタ（HEADの集計がGETの本体保持を待たせない）
const acquireHeadStats = createSemaphore(MAX_CONCURRENT_HEAD_STATS, HEAD_ACQUIRE_TIMEOUT_MS);

/**
 * HEADのDB集計を同時数制限つきで実行する。許可待ちがタイムアウトしたら`FileBusyError`
 * （呼び出し側で503）。解放は正常・例外のいずれでも必ず行う。
 */
export async function withHeadStatsPermit<T>(task: () => Promise<T>): Promise<T> {
  const releaseOnce = await acquireHeadStats();
  try {
    return await task();
  } finally {
    releaseOnce();
  }
}

/** 503（no-store）。 */
export function busyResponse(): Response {
  return withNoStore(Response.json({ error: "Service Unavailable" }, { status: 503 }));
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
 * HEAD用にDB側で集計した本体の統計（本体そのものはNodeへ転送しない）。
 * `head`は先頭プレフィックス、`cleanLength`はプレフィックス以降から改行・空白（CR/LF/タブ/スペース）を
 * 除いた長さ、`cleanTail`はその末尾2文字、`firstPad`は最初の`=`の位置（1始まり、無ければ0）。
 */
export interface PdfFileStats {
  head: string;
  cleanLength: number;
  cleanTail: string;
  firstPad: number;
}

/**
 * `Buffer.from(str, "base64").length`と同じ計算（パディング`=`を考慮。末尾が切れた
 * 余り1文字は0バイト、余り2文字は1バイト、余り3文字は2バイト＝`floor(size*3/4)`）。
 * 途中に`=`を含む等の不正なデータでは実際のデコード結果と食い違い得る。
 */
export function base64DecodedSize(cleanLength: number, cleanTail: string): number {
  let size = cleanLength;
  if (size > 0 && cleanTail.endsWith("=")) {
    size -= 1;
    if (size > 0 && cleanTail.length >= 2 && cleanTail[cleanTail.length - 2] === "=") {
      size -= 1;
    }
  }
  const remainder = size % 4;
  return (
    Math.floor(size / 4) * 3 + (remainder === 1 ? 0 : remainder === 2 ? 1 : remainder === 3 ? 2 : 0)
  );
}

/**
 * HEAD用。本体を読み込まず、DB側で集計した統計からGETと同じヘッダーだけを返す
 * （GET本体用のセマフォは使わない。サイズ集計はroute側でHEAD専用の別セマフォ`withHeadStatsPermit`を使う）。dataUrlがPDFのプレフィックスでない場合は404。
 * 注意: 末尾以外に`=`を含む不正なbase64では、HEADのContent-LengthとGETの実バイト数が
 * 食い違い得る（GETは実際にデコードした長さを返すので自己整合）。検出時は警告ログを残す。
 */
export function pdfFileHeadResponse(
  file: { fileName: string },
  stats: PdfFileStats,
  options: { download: boolean }
): Response {
  if (!PDF_DATA_URL_PREFIX.test(stats.head)) {
    logger.error("document file integrity error: dataUrl is not a base64 PDF", {
      fileName: file.fileName,
    });
    return withNoStore(Response.json({ error: "Not Found" }, { status: 404 }));
  }
  if (stats.firstPad > 0 && stats.firstPad < stats.cleanLength - 1) {
    logger.warn("document file integrity warning: base64 has padding before the end", {
      fileName: file.fileName,
    });
  }
  const length = base64DecodedSize(stats.cleanLength, stats.cleanTail);
  return new Response(null, {
    status: 200,
    headers: fileHeaders(length, file.fileName, options),
  });
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
 * PDF配信レスポンスを作る。本体（dataUrl）をDBから読む前にセマフォの許可を取得し、
 * `load`で本体を取得→デコード→ストリーム送信の間だけ許可を保持する（同時にメモリへ載る本体は
 * 最大2件）。許可の解放はボディの送信完了・cancel・例外・本体なし（404）で必ず行い、
 * 保険として最大保持時間でも解放する。許可待ちが長引いた場合は503。
 * Content-Typeは固定で`application/pdf`（DBのfileTypeは使わない）、`nosniff`・`private, no-store`を付ける。
 * `load`がnull・dataUrlがPDFとして不正な場合は404。
 */
export async function pdfFileResponse(
  load: () => Promise<{ fileName: string; dataUrl: string } | null>,
  options: { download: boolean }
): Promise<Response> {
  let releaseOnce: () => void;
  try {
    releaseOnce = await acquire();
  } catch (error) {
    if (error instanceof FileBusyError) {
      logger.warn("document file delivery busy: acquire timed out", {});
      return busyResponse();
    }
    throw error;
  }

  try {
    const file = await load();
    if (!file) {
      releaseOnce();
      return withNoStore(Response.json({ error: "Not Found" }, { status: 404 }));
    }
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
