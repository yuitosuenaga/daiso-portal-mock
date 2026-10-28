import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/document-service", () => ({
  findDocumentFileVisibleTo: vi.fn(),
  findDocumentFileById: vi.fn(),
}));
vi.mock("@/lib/server/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  errorFields: vi.fn(() => ({})),
}));

import { getSession } from "@/lib/server/get-session";
import {
  findDocumentFileById,
  findDocumentFileVisibleTo,
} from "@/lib/server/document-service";
import { GET } from "@/app/api/documents/[id]/file/route";

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
    expect((await call()).status).toBe(401);
  });

  it("claimsがnull（無効化ユーザー）のとき401を返す", async () => {
    vi.mocked(getSession).mockResolvedValue({ claims: null } as never);
    const response = await call();
    expect(response.status).toBe(401);
    expect(findDocumentFileVisibleTo).not.toHaveBeenCalled();
  });

  it("申請者で対象外・下書き・存在しない場合は404、serviceは(id, country, companyCode)で呼ばれる", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findDocumentFileVisibleTo).mockResolvedValue(null);

    const response = await call();

    expect(findDocumentFileVisibleTo).toHaveBeenCalledWith("doc-1", "JP", "test-co");
    expect(findDocumentFileById).not.toHaveBeenCalled();
    expect(response.status).toBe(404);
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
