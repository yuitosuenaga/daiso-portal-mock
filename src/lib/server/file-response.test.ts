import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  errorFields: vi.fn(() => ({})),
}));

import { logger } from "@/lib/server/logger";
import {
  buildContentDisposition,
  parsePdfDataUrl,
  pdfFileResponse,
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
    const value = buildContentDisposition("attachment", 'a"\r\nSet-Cookie: x.pdf');
    expect(value).not.toMatch(/[\r\n]/);
    const ascii = /filename="([^"]*)"/.exec(value);
    expect(ascii).not.toBeNull();
    expect(ascii![1]).not.toContain("\\");
    expect(value.startsWith("attachment;")).toBe(true);
    // filename*部に生の引用符が混入しない
    expect(value.split("filename*=")[1]).not.toContain('"');
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
      { fileName: "a.pdf", dataUrl: PDF_DATA_URL },
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
      { fileName: "a.pdf", dataUrl: PDF_DATA_URL },
      { download: true }
    );
    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment;/);
  });

  it("PDFでないdataUrlは404にしてログに残す", async () => {
    const response = await pdfFileResponse(
      { fileName: "a.pdf", dataUrl: "data:text/html;base64,PGI+PC9iPg==" },
      { download: false }
    );
    expect(response.status).toBe(404);
    expect(logger.error).toHaveBeenCalled();
  });

  it("本体を読まずにcancelしても許可が解放され、後続が詰まらない", async () => {
    for (let i = 0; i < 4; i += 1) {
      const response = await pdfFileResponse(
        { fileName: "a.pdf", dataUrl: PDF_DATA_URL },
        { download: false }
      );
      await response.body?.cancel();
    }
    const last = await pdfFileResponse(
      { fileName: "a.pdf", dataUrl: PDF_DATA_URL },
      { download: false }
    );
    expect(last.status).toBe(200);
    await last.arrayBuffer();
  });

  it("同時に多数呼んでも全て完了する（セマフォで詰まらない）", async () => {
    const statuses = await Promise.all(
      Array.from({ length: 6 }, async () => {
        const response = await pdfFileResponse(
          { fileName: "a.pdf", dataUrl: PDF_DATA_URL },
          { download: false }
        );
        await response.arrayBuffer();
        return response.status;
      })
    );
    expect(statuses).toEqual([200, 200, 200, 200, 200, 200]);
  });
});
