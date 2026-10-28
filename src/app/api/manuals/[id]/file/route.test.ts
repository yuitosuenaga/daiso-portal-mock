import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/manual-service", () => ({
  findManualFileVisibleTo: vi.fn(),
  findManualFileById: vi.fn(),
  findManualFileMetaVisibleTo: vi.fn(),
  findManualFileMetaById: vi.fn(),
  getManualFileStats: vi.fn(),
}));
vi.mock("@/lib/server/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  errorFields: vi.fn(() => ({})),
}));

import { getSession } from "@/lib/server/get-session";
import {
  findManualFileById,
  findManualFileMetaById,
  findManualFileMetaVisibleTo,
  findManualFileVisibleTo,
  getManualFileStats,
} from "@/lib/server/manual-service";
import { GET, HEAD } from "@/app/api/manuals/[id]/file/route";

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
  claims: {
    id: "staff-1",
    role: "helpdesk" as const,
    staffId: "staff-1",
    displayName: "田中",
  },
};

const PDF_BYTES = Buffer.from("%PDF-1.4 route test");
const file = {
  fileName: "マニュアル.pdf",
  dataUrl: `data:application/pdf;base64,${PDF_BYTES.toString("base64")}`,
};

const meta = { id: "manual-1", fileName: "マニュアル.pdf" };
const stats = {
  head: file.dataUrl.slice(0, 300),
  cleanLength: PDF_BYTES.toString("base64").length,
  cleanTail: PDF_BYTES.toString("base64").slice(-2),
  firstPad: PDF_BYTES.toString("base64").indexOf("=") + 1,
};

beforeEach(() => {
  vi.resetAllMocks();
  // 認可確認は常に通り、可視性で弾く場合は各テストでnullに上書きする
  vi.mocked(findManualFileMetaVisibleTo).mockResolvedValue(meta);
  vi.mocked(findManualFileMetaById).mockResolvedValue(meta);
  vi.mocked(getManualFileStats).mockResolvedValue(stats);
});

const call = (url = "http://localhost/api/manuals/manual-1/file") =>
  GET(new Request(url), { params: Promise.resolve({ id: "manual-1" }) });

// 配信中はファイル本体の同時保持数が制限されるため、検証後に本体を破棄して許可を解放する。
async function callAndRelease(url?: string) {
  const response = await call(url);
  const headers = response.headers;
  const status = response.status;
  await response.body?.cancel();
  return { status, headers };
}

describe("GET /api/manuals/[id]/file", () => {
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
    expect(findManualFileMetaVisibleTo).not.toHaveBeenCalled();
  });

  it("申請者で対象外・存在しない場合は404、serviceは(id, country, companyCode)で呼ばれる", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findManualFileMetaVisibleTo).mockResolvedValue(null);

    const response = await call();

    expect(findManualFileMetaVisibleTo).toHaveBeenCalledWith("manual-1", "JP", "test-co");
    expect(findManualFileMetaById).not.toHaveBeenCalled();
    expect(findManualFileVisibleTo).not.toHaveBeenCalled();
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("申請者で可視ならPDFを200で返す（inline・no-store・nosniff）", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findManualFileVisibleTo).mockResolvedValue(file);

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
    vi.mocked(findManualFileVisibleTo).mockResolvedValue(file);

    const response = await callAndRelease("http://localhost/api/manuals/manual-1/file?download=1");

    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment; filename=/);
  });

  it("ヘルプデスクはfindManualFileByIdで取得し200を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findManualFileById).mockResolvedValue(file);

    const response = await callAndRelease();

    expect(findManualFileMetaById).toHaveBeenCalledWith("manual-1");
    expect(findManualFileById).toHaveBeenCalledWith("manual-1");
    expect(response.status).toBe(200);
  });

  it("dataUrlがPDFでない場合は404を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findManualFileVisibleTo).mockResolvedValue({
      fileName: "a.pdf",
      dataUrl: "data:text/html;base64,PGI+PC9iPg==",
    });
    expect((await call()).status).toBe(404);
  });
});

describe("HEAD /api/manuals/[id]/file", () => {
  const head = (url = "http://localhost/api/manuals/manual-1/file") =>
    HEAD(new Request(url, { method: "HEAD" }), {
      params: Promise.resolve({ id: "manual-1" }),
    });

  it("可視ならボディなしでGETと同じヘッダーを返し、何度呼んでもGETが詰まらない", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findManualFileVisibleTo).mockResolvedValue(file);

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
    vi.mocked(findManualFileMetaVisibleTo).mockResolvedValue(null);
    const notFound = await head();
    expect(notFound.status).toBe(404);
    expect(notFound.headers.get("Cache-Control")).toBe("private, no-store");
    expect(getManualFileStats).not.toHaveBeenCalled();
  });

  it("HEADは本体を読む取得関数を一切呼ばず、認可確認(meta)と統計だけを使う", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    const response = await head();
    expect(response.status).toBe(200);
    expect(findManualFileMetaVisibleTo).toHaveBeenCalledWith("manual-1", "JP", "test-co");
    expect(getManualFileStats).toHaveBeenCalledWith("manual-1");
    expect(findManualFileVisibleTo).not.toHaveBeenCalled();
    expect(findManualFileById).not.toHaveBeenCalled();
  });

  it("統計が取れない（dataUrlなし）場合は404", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(getManualFileStats).mockResolvedValue(null);
    const response = await head();
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("ヘルプデスクもmeta(ID)で認可確認し、本体は読まない", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    const response = await head();
    expect(response.status).toBe(200);
    expect(findManualFileMetaById).toHaveBeenCalledWith("manual-1");
    expect(findManualFileById).not.toHaveBeenCalled();
  });
});

describe("HEAD /api/manuals/[id]/file: DB集計の同時数制限", () => {
  const head = () =>
    HEAD(
      new Request("http://localhost/api/manuals/manual-1/file", {
        method: "HEAD",
      }),
      {
        params: Promise.resolve({ id: "manual-1" }),
      }
    );

  afterEach(() => {
    vi.useRealTimers();
  });

  it("50並列でも、同時にDB集計が走るのは最大3件で、全て200", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    let running = 0;
    let maxRunning = 0;
    vi.mocked(getManualFileStats).mockImplementation(async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running -= 1;
      return stats;
    });
    const responses = await Promise.all(Array.from({ length: 50 }, () => head()));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(maxRunning).toBeLessThanOrEqual(3);
  });

  it("許可待ちが長引いたら503（no-store）、集計が例外でも許可は戻る", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.useFakeTimers();
    const gates: (() => void)[] = [];
    vi.mocked(getManualFileStats).mockImplementation(
      () =>
        new Promise((resolve) => {
          gates.push(() => resolve(stats));
        })
    );
    const held = [head(), head(), head()];
    await vi.advanceTimersByTimeAsync(0);
    const waiting = head();
    await vi.advanceTimersByTimeAsync(15_000);
    const busy = await waiting;
    expect(busy.status).toBe(503);
    expect(busy.headers.get("Cache-Control")).toBe("private, no-store");

    gates.forEach((open) => open());
    expect((await Promise.all(held)).every((response) => response.status === 200)).toBe(true);

    vi.mocked(getManualFileStats).mockRejectedValue(new Error("db down"));
    for (let i = 0; i < 10; i += 1) {
      expect((await head()).status).toBe(500);
    }
    vi.mocked(getManualFileStats).mockResolvedValue(stats);
    expect((await head()).status).toBe(200);
  });
});

describe("GET /api/manuals/[id]/file: 本体取得はセマフォ取得後", () => {
  it("50並列でも、同時に本体を取得・保持するのは最大2件", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    let holding = 0;
    let maxHolding = 0;
    vi.mocked(findManualFileVisibleTo).mockImplementation(async () => {
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
    expect(findManualFileMetaVisibleTo).toHaveBeenCalledTimes(50);
  });

  it("本体取得で可視性が失われていたら404（許可は解放される）", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findManualFileVisibleTo).mockResolvedValue(null);
    for (let i = 0; i < 4; i += 1) {
      const response = await call();
      expect(response.status).toBe(404);
    }
    vi.mocked(findManualFileVisibleTo).mockResolvedValue(file);
    const ok = await callAndRelease();
    expect(ok.status).toBe(200);
  });

  it("本体取得が例外でも許可が解放され、後続のGETが通る", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findManualFileVisibleTo).mockRejectedValue(new Error("db down"));
    for (let i = 0; i < 4; i += 1) {
      const response = await call();
      expect(response.status).toBe(500);
    }
    vi.mocked(findManualFileVisibleTo).mockResolvedValue(file);
    const ok = await callAndRelease();
    expect(ok.status).toBe(200);
  });
});
