import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/document-service", () => ({
  findDocumentFileVisibleTo: vi.fn(),
  findDocumentFileById: vi.fn(),
  findDocumentFileMetaVisibleTo: vi.fn(),
  findDocumentFileMetaById: vi.fn(),
  getDocumentFileStats: vi.fn(),
}));
vi.mock("@/lib/server/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  errorFields: vi.fn(() => ({})),
}));

import { getSession } from "@/lib/server/get-session";
import {
  findDocumentFileById,
  findDocumentFileMetaById,
  findDocumentFileMetaVisibleTo,
  findDocumentFileVisibleTo,
  getDocumentFileStats,
} from "@/lib/server/document-service";
import { GET, HEAD } from "@/app/api/documents/[id]/file/route";

const applicantSession = {
  claims: {
    id: "applicant-1",
    role: "applicant" as const,
    applicantUserId: "applicant-1",
    companyId: "company-1",
    companyName: "Test Co.",
    companyCode: "test-co",
    country: "JP",
  },
};
const helpdeskSession = {
  claims: { id: "staff-1", role: "helpdesk" as const, staffId: "staff-1", displayName: "田中" },
};

const PDF_BYTES = Buffer.from("%PDF-1.4 route test");
const file = {
  fileName: "資料.pdf",
  dataUrl: `data:application/pdf;base64,${PDF_BYTES.toString("base64")}`,
};

const meta = { id: "doc-1", fileName: "資料.pdf" };
const stats = {
  head: file.dataUrl.slice(0, 300),
  cleanLength: PDF_BYTES.toString("base64").length,
  cleanTail: PDF_BYTES.toString("base64").slice(-2),
  firstPad: PDF_BYTES.toString("base64").indexOf("=") + 1,
};

beforeEach(() => {
  vi.resetAllMocks();
  // 認可確認は常に通り、可視性で弾く場合は各テストでnullに上書きする
  vi.mocked(findDocumentFileMetaVisibleTo).mockResolvedValue(meta);
  vi.mocked(findDocumentFileMetaById).mockResolvedValue(meta);
  vi.mocked(getDocumentFileStats).mockResolvedValue(stats);
});

const call = (url = "http://localhost/api/documents/doc-1/file") =>
  GET(new Request(url), { params: Promise.resolve({ id: "doc-1" }) });

// 配信中はファイル本体の同時保持数が制限されるため、検証後に本体を破棄して許可を解放する。
async function callAndRelease(url?: string) {
  const response = await call(url);
  const headers = response.headers;
  const status = response.status;
  await response.body?.cancel();
  return { status, headers };
}

describe("GET /api/documents/[id]/file", () => {
  it("未ログインのとき401を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const response = await call();
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("claimsがnull（無効化ユーザー）のとき401を返す", async () => {
    vi.mocked(getSession).mockResolvedValue({ claims: null } as never);
    const response = await call();
    expect(response.status).toBe(401);
    expect(findDocumentFileMetaVisibleTo).not.toHaveBeenCalled();
  });

  it("申請者で対象外・下書き・存在しない場合は404、serviceは(id, country, companyCode)で呼ばれる", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findDocumentFileMetaVisibleTo).mockResolvedValue(null);

    const response = await call();

    expect(findDocumentFileMetaVisibleTo).toHaveBeenCalledWith("doc-1", "JP", "test-co");
    expect(findDocumentFileMetaById).not.toHaveBeenCalled();
    expect(findDocumentFileVisibleTo).not.toHaveBeenCalled();
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("申請者で可視ならPDFを200で返す（inline・no-store・nosniff）", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findDocumentFileVisibleTo).mockResolvedValue(file);

    const response = await call();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toMatch(/^inline; filename=/);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(Buffer.from(await response.arrayBuffer()).equals(PDF_BYTES)).toBe(true);
  });

  it("?download=1でattachmentにする", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findDocumentFileVisibleTo).mockResolvedValue(file);

    const response = await callAndRelease("http://localhost/api/documents/doc-1/file?download=1");

    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment; filename=/);
  });

  it("ヘルプデスクはfindDocumentFileByIdで取得し200を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findDocumentFileById).mockResolvedValue(file);

    const response = await callAndRelease();

    expect(findDocumentFileMetaById).toHaveBeenCalledWith("doc-1");
    expect(findDocumentFileById).toHaveBeenCalledWith("doc-1");
    expect(response.status).toBe(200);
  });

  it("dataUrlがPDFでない場合は404を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findDocumentFileVisibleTo).mockResolvedValue({
      fileName: "a.pdf",
      dataUrl: "data:text/html;base64,PGI+PC9iPg==",
    });
    expect((await call()).status).toBe(404);
  });
});

describe("HEAD /api/documents/[id]/file", () => {
  const head = (url = "http://localhost/api/documents/doc-1/file") =>
    HEAD(new Request(url, { method: "HEAD" }), { params: Promise.resolve({ id: "doc-1" }) });

  it("可視ならボディなしでGETと同じヘッダーを返し、何度呼んでもGETが詰まらない", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findDocumentFileVisibleTo).mockResolvedValue(file);

    for (let i = 0; i < 6; i += 1) {
      const response = await head();
      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
      expect(response.headers.get("Content-Type")).toBe("application/pdf");
      expect(response.headers.get("Content-Length")).toBe(String(PDF_BYTES.length));
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    }
    const get = await call();
    expect(get.status).toBe(200);
    await get.arrayBuffer();
  });

  it("未ログインは401、対象外は404（どちらもno-store）", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const unauthorized = await head();
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("Cache-Control")).toBe("private, no-store");

    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findDocumentFileMetaVisibleTo).mockResolvedValue(null);
    const notFound = await head();
    expect(notFound.status).toBe(404);
    expect(notFound.headers.get("Cache-Control")).toBe("private, no-store");
    expect(getDocumentFileStats).not.toHaveBeenCalled();
  });

  it("HEADは本体を読む取得関数を一切呼ばず、認可確認(meta)と統計だけを使う", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    const response = await head();
    expect(response.status).toBe(200);
    expect(findDocumentFileMetaVisibleTo).toHaveBeenCalledWith("doc-1", "JP", "test-co");
    expect(getDocumentFileStats).toHaveBeenCalledWith("doc-1");
    expect(findDocumentFileVisibleTo).not.toHaveBeenCalled();
    expect(findDocumentFileById).not.toHaveBeenCalled();
  });

  it("統計が取れない（dataUrlなし）場合は404", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(getDocumentFileStats).mockResolvedValue(null);
    const response = await head();
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("ヘルプデスクもmeta(ID)で認可確認し、本体は読まない", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    const response = await head();
    expect(response.status).toBe(200);
    expect(findDocumentFileMetaById).toHaveBeenCalledWith("doc-1");
    expect(findDocumentFileById).not.toHaveBeenCalled();
  });
});

describe("GET /api/documents/[id]/file: 本体取得はセマフォ取得後", () => {
  it("50並列でも、同時に本体を取得・保持するのは最大2件", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    let holding = 0;
    let maxHolding = 0;
    vi.mocked(findDocumentFileVisibleTo).mockImplementation(async () => {
      holding += 1;
      maxHolding = Math.max(maxHolding, holding);
      await new Promise((resolve) => setTimeout(resolve, 1));
      return file;
    });

    const statuses = await Promise.all(
      Array.from({ length: 50 }, async () => {
        const response = await call();
        const reader = response.body!.getReader();
        holding -= 1;
        await reader.read();
        await reader.read();
        return response.status;
      })
    );

    expect(statuses.every((status) => status === 200)).toBe(true);
    expect(maxHolding).toBeLessThanOrEqual(2);
    // 認可確認(meta)は本体取得の件数と無関係に全件で行われる
    expect(findDocumentFileMetaVisibleTo).toHaveBeenCalledTimes(50);
  });

  it("本体取得で可視性が失われていたら404（許可は解放される）", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findDocumentFileVisibleTo).mockResolvedValue(null);
    for (let i = 0; i < 4; i += 1) {
      const response = await call();
      expect(response.status).toBe(404);
    }
    vi.mocked(findDocumentFileVisibleTo).mockResolvedValue(file);
    const ok = await callAndRelease();
    expect(ok.status).toBe(200);
  });

  it("本体取得が例外でも許可が解放され、後続のGETが通る", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findDocumentFileVisibleTo).mockRejectedValue(new Error("db down"));
    for (let i = 0; i < 4; i += 1) {
      const response = await call();
      expect(response.status).toBe(500);
    }
    vi.mocked(findDocumentFileVisibleTo).mockResolvedValue(file);
    const ok = await callAndRelease();
    expect(ok.status).toBe(200);
  });
});
