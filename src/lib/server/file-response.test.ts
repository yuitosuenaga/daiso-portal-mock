import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  errorFields: vi.fn(() => ({})),
}));

import { logger } from "@/lib/server/logger";
import {
  ACQUIRE_TIMEOUT_MS,
  MAX_HOLD_MS,
  base64DecodedSize,
  buildContentDisposition,
  parsePdfDataUrl,
  pdfFileHeadResponse,
  pdfFileResponse,
  withNoStore,
} from "@/lib/server/file-response";

const PDF_BYTES = Buffer.from("%PDF-1.4 test");
const PDF_DATA_URL = `data:application/pdf;base64,${PDF_BYTES.toString("base64")}`;

describe("parsePdfDataUrl", () => {
  it("application/pdfのbase64をBufferに復元する", () => {
    expect(parsePdfDataUrl(PDF_DATA_URL)?.equals(PDF_BYTES)).toBe(true);
  });

  it("パラメータ付き(;name=...;base64)も許容する", () => {
    const url = `data:application/pdf;name=a.pdf;base64,${PDF_BYTES.toString("base64")}`;
    expect(parsePdfDataUrl(url)?.equals(PDF_BYTES)).toBe(true);
  });

  it("PDF以外のMIMEはnull", () => {
    expect(parsePdfDataUrl("data:text/html;base64,PGI+PC9iPg==")).toBeNull();
    expect(parsePdfDataUrl("data:image/png;base64,AAAA")).toBeNull();
  });

  it("base64でない・data:でないものはnull", () => {
    expect(parsePdfDataUrl("data:application/pdf,abc")).toBeNull();
    expect(parsePdfDataUrl("https://example.com/a.pdf")).toBeNull();
    expect(parsePdfDataUrl("")).toBeNull();
  });
});

describe("buildContentDisposition", () => {
  it("CR/LF・引用符・バックスラッシュを含まない（ヘッダーインジェクション対策）", () => {
    const value = buildContentDisposition("attachment", 'a"b\\c\r\nSet-Cookie: x.pdf');
    expect(value).not.toMatch(/[\r\n]/);
    const match = /^attachment; filename="([^"\\]*)"; filename\*=UTF-8''([A-Za-z0-9%._~-]*)$/.exec(
      value
    );
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/^[\x20-\x7e]*$/);
    expect(match![1]).toBe("abcSet-Cookie: x.pdf");
    expect(match![2]).toBe("abcSet-Cookie%3A%20x.pdf");
  });

  it("日本語名はASCIIフォールバックとRFC5987のfilename*を併記する", () => {
    const value = buildContentDisposition("inline", "資料.pdf");
    expect(value).toContain('filename="__.pdf"');
    expect(value).toContain("filename*=UTF-8''%E8%B3%87%E6%96%99.pdf");
    expect(value.startsWith("inline;")).toBe(true);
  });

  it("空名・制御文字だけの名前はdocument.pdfにフォールバックする", () => {
    expect(buildContentDisposition("inline", "")).toContain('filename="document.pdf"');
    expect(buildContentDisposition("inline", "\r\n\t")).toContain('filename="document.pdf"');
  });
});

describe("pdfFileResponse", () => {
  it("PDFを固定Content-Type・安全なヘッダーで返す", async () => {
    const response = await pdfFileResponse(
      async () => ({ fileName: "a.pdf", dataUrl: PDF_DATA_URL }),
      { download: false }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Length")).toBe(String(PDF_BYTES.length));
    expect(response.headers.get("Content-Disposition")).toMatch(/^inline;/);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(Buffer.from(await response.arrayBuffer()).equals(PDF_BYTES)).toBe(true);
  });

  it("download:trueでattachmentにする", async () => {
    const response = await pdfFileResponse(
      async () => ({ fileName: "a.pdf", dataUrl: PDF_DATA_URL }),
      { download: true }
    );
    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment;/);
    await response.body?.cancel();
  });

  it("PDFでないdataUrlは404にしてログに残す", async () => {
    const response = await pdfFileResponse(
      async () => ({
        fileName: "a.pdf",
        dataUrl: "data:text/html;base64,PGI+PC9iPg==",
      }),
      { download: false }
    );
    expect(response.status).toBe(404);
    expect(logger.error).toHaveBeenCalled();
  });

  it("本体を読まずにcancelしても許可が解放され、後続が詰まらない", async () => {
    for (let i = 0; i < 4; i += 1) {
      const response = await pdfFileResponse(
        async () => ({ fileName: "a.pdf", dataUrl: PDF_DATA_URL }),
        { download: false }
      );
      await response.body?.cancel();
    }
    const last = await pdfFileResponse(async () => ({ fileName: "a.pdf", dataUrl: PDF_DATA_URL }), {
      download: false,
    });
    expect(last.status).toBe(200);
    await last.arrayBuffer();
  });

  it("同時に多数呼んでも全て完了する（セマフォで詰まらない）", async () => {
    const statuses = await Promise.all(
      Array.from({ length: 6 }, async () => {
        const response = await pdfFileResponse(
          async () => ({ fileName: "a.pdf", dataUrl: PDF_DATA_URL }),
          { download: false }
        );
        await response.arrayBuffer();
        return response.status;
      })
    );
    expect(statuses).toEqual([200, 200, 200, 200, 200, 200]);
  });
});

describe("pdfFileResponse: 404のキャッシュ制御", () => {
  it("PDFでないdataUrlの404にもCache-Control: private, no-storeを付ける", async () => {
    const response = await pdfFileResponse(
      async () => ({
        fileName: "a.pdf",
        dataUrl: "data:text/html;base64,PGI+PC9iPg==",
      }),
      { download: false }
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

describe("withNoStore", () => {
  it("Cache-Control: private, no-storeを付ける", () => {
    expect(withNoStore(Response.json({}, { status: 401 })).headers.get("Cache-Control")).toBe(
      "private, no-store"
    );
  });
});

/** テスト用: GET本体と同じ計算になるはずの統計をJS側で作る（SQLの集計の代用）。 */
function statsOf(dataUrl: string) {
  const head = dataUrl.slice(0, 300);
  const clean = dataUrl.slice(dataUrl.indexOf(",") + 1).replace(/[^A-Za-z0-9+/=_-]/g, "");
  return {
    head,
    cleanLength: clean.length,
    cleanTail: clean.slice(-2),
    firstPad: clean.indexOf("=") + 1,
  };
}
const getFile = (dataUrl: string) => async () => ({
  fileName: "a.pdf",
  dataUrl,
});

describe("base64DecodedSize", () => {
  it("Buffer.from(..., base64).lengthと一致する（パディング有無・各長さ・改行除去後）", () => {
    for (let n = 0; n < 40; n += 1) {
      const bytes = Buffer.alloc(n, 7);
      const padded = bytes.toString("base64");
      const unpadded = padded.replace(/=+$/, "");
      for (const text of [padded, unpadded]) {
        const stats = statsOf(`data:application/pdf;base64,${text}`);
        expect(base64DecodedSize(stats.cleanLength, stats.cleanTail)).toBe(
          Buffer.from(text, "base64").length
        );
      }
    }
  });
});

describe("pdfFileHeadResponse", () => {
  it("ボディなしでGETと同じヘッダーを返し、許可を消費しない", async () => {
    // 許可を超える回数呼んでも詰まらない（acquireしない）
    for (let i = 0; i < 5; i += 1) {
      const response = pdfFileHeadResponse({ fileName: "a.pdf" }, statsOf(PDF_DATA_URL), {
        download: false,
      });
      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
      expect(response.headers.get("Content-Type")).toBe("application/pdf");
      expect(response.headers.get("Content-Length")).toBe(String(PDF_BYTES.length));
      expect(response.headers.get("Content-Disposition")).toMatch(/^inline;/);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    }
    const get = await pdfFileResponse(getFile(PDF_DATA_URL), {
      download: false,
    });
    expect(get.status).toBe(200);
    await get.arrayBuffer();
  });

  it("改行入りbase64でもContent-LengthがGET本体のバイト数と一致する", async () => {
    const wrapped = PDF_BYTES.toString("base64").replace(/(.{8})/g, "$1\r\n");
    const dataUrl = `data:application/pdf;base64,${wrapped}`;
    const head = pdfFileHeadResponse({ fileName: "a.pdf" }, statsOf(dataUrl), {
      download: false,
    });
    const get = await pdfFileResponse(getFile(dataUrl), { download: false });
    const body = Buffer.from(await get.arrayBuffer());
    expect(head.headers.get("Content-Length")).toBe(String(body.length));
    expect(body.equals(PDF_BYTES)).toBe(true);
  });

  it("PDFでないdataUrl（先頭プレフィックス）は404（no-store）", () => {
    const response = pdfFileHeadResponse(
      { fileName: "a.pdf" },
      statsOf("data:text/html;base64,PGI+PC9iPg=="),
      { download: false }
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("末尾以外に=があるbase64は警告ログを残す", () => {
    pdfFileHeadResponse({ fileName: "a.pdf" }, statsOf("data:application/pdf;base64,QQ==QQ=="), {
      download: false,
    });
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe("pdfFileResponse: 本体読み込みはセマフォ取得後", () => {
  it("loadが許可取得後にだけ呼ばれ、同時にloadが走るのは最大2件（50並列）", async () => {
    let running = 0;
    let maxRunning = 0;
    const load = async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      return { fileName: "a.pdf", dataUrl: PDF_DATA_URL };
    };
    const statuses = await Promise.all(
      Array.from({ length: 50 }, async () => {
        const response = await pdfFileResponse(
          async () => {
            return load();
          },
          { download: false }
        );
        // 読み始める時点（許可の解放より前）で保持終了とみなす（過小計上なので緩い側。無制限なら50件が同時に走り検出できる）
        const reader = response.body!.getReader();
        running -= 1;
        await reader.read();
        await reader.read();
        return response.status;
      })
    );
    expect(statuses.every((status) => status === 200)).toBe(true);
    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it("許可が埋まっている間はloadを呼ばない", async () => {
    const first = await pdfFileResponse(getFile(PDF_DATA_URL), {
      download: false,
    });
    const second = await pdfFileResponse(getFile(PDF_DATA_URL), {
      download: false,
    });
    const load = vi.fn(async () => ({
      fileName: "a.pdf",
      dataUrl: PDF_DATA_URL,
    }));
    const third = pdfFileResponse(load, { download: false });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(load).not.toHaveBeenCalled();
    await first.body?.cancel();
    const response = await third;
    expect(load).toHaveBeenCalledTimes(1);
    await response.body?.cancel();
    await second.body?.cancel();
  });

  it("loadが例外でも許可が解放され、後続が詰まらない", async () => {
    for (let i = 0; i < 4; i += 1) {
      await expect(
        pdfFileResponse(
          async () => {
            throw new Error("db down");
          },
          { download: false }
        )
      ).rejects.toThrow("db down");
    }
    const ok = await pdfFileResponse(getFile(PDF_DATA_URL), {
      download: false,
    });
    expect(ok.status).toBe(200);
    await ok.arrayBuffer();
  });

  it("loadがnullなら404で、許可も解放される", async () => {
    for (let i = 0; i < 4; i += 1) {
      const response = await pdfFileResponse(async () => null, {
        download: false,
      });
      expect(response.status).toBe(404);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    }
    const ok = await pdfFileResponse(getFile(PDF_DATA_URL), {
      download: false,
    });
    expect(ok.status).toBe(200);
    await ok.arrayBuffer();
  });
});

describe("セマフォの保険（許可が戻らない場合）", () => {
  // セマフォはモジュール内の状態なので、テストごとに新しいモジュールを使う
  let open: () => Promise<Response>;
  beforeEach(async () => {
    vi.resetModules();
    const fresh = await import("@/lib/server/file-response");
    open = () =>
      fresh.pdfFileResponse(async () => ({ fileName: "a.pdf", dataUrl: PDF_DATA_URL }), {
        download: false,
      });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("許可待ちがタイムアウトしたら503（no-store）を返し、待ちは残らない", async () => {
    vi.useFakeTimers();
    // 読まず・cancelしない2件で許可を使い切る
    const held = [await open(), await open()];
    const waiting = open();
    await vi.advanceTimersByTimeAsync(ACQUIRE_TIMEOUT_MS);
    const busy = await waiting;
    expect(busy.status).toBe(503);
    expect(busy.headers.get("Cache-Control")).toBe("private, no-store");

    // 最大保持時間で保持分が自動解放され、後続が通る
    await vi.advanceTimersByTimeAsync(MAX_HOLD_MS);
    const after = await open();
    expect(after.status).toBe(200);
    await after.arrayBuffer();
    expect(held).toHaveLength(2);
  });

  it("最大保持時間で解放され、待機中の呼び出しに許可が渡る", async () => {
    vi.useFakeTimers();
    await open();
    await open();
    // 待機の開始を保持時間の終わり直前にして、待ちタイムアウトより先に許可が戻る状況にする
    await vi.advanceTimersByTimeAsync(MAX_HOLD_MS - 1000);
    const waiting = open();
    await vi.advanceTimersByTimeAsync(1000);
    const response = await waiting;
    expect(response.status).toBe(200);
    await response.arrayBuffer();
  });

  it("タイマー解放後にcancel/完了しても二重解放されない", async () => {
    vi.useFakeTimers();
    const first = await open();
    const second = await open();
    await vi.advanceTimersByTimeAsync(MAX_HOLD_MS); // 2件ともタイマーで解放
    // 解放後の遅延cancelは無効（二重解放ならactiveFilesが負になり許可が3件以上出る）
    await first.body?.cancel();
    await second.body?.cancel();

    const held = [await open(), await open()];
    const third = open();
    let settled = false;
    void third.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(settled).toBe(false); // 3件目は待たされる = 許可は2件のまま
    await held[0].body?.cancel();
    expect((await third).status).toBe(200);
    await held[1].body?.cancel();
  });
});
