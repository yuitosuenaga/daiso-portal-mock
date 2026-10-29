import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/log-retention", () => ({
  runLogRetention: vi.fn(),
}));

import type { LogRetentionResult } from "@/lib/server/log-retention";
import { runLogRetention } from "@/lib/server/log-retention";
import { logger } from "@/lib/server/logger";
import { GET, POST } from "@/app/api/cron/log-retention/route";

function request(headers: Record<string, string> = {}, search = "") {
  return new NextRequest(`http://localhost/api/cron/log-retention${search}`, {
    method: "GET",
    headers,
  });
}

function result(
  overrides: Partial<LogRetentionResult> = {},
): LogRetentionResult {
  return {
    tables: {
      authEvent: { deleted: 0, hasMore: false },
      loginThrottle: { deleted: 0, hasMore: false },
      announcementNotificationLog: { deleted: 0, hasMore: false },
    },
    dryRun: false,
    durationMs: 1,
    ...overrides,
  };
}

const originalCronSecret = process.env.CRON_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalCronSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalCronSecret;
  }
});

describe("GET /api/cron/log-retention", () => {
  it("CRON_SECRET未設定は401・固定文言で、サービスを呼ばない", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(request({ authorization: "Bearer anything" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(runLogRetention).not.toHaveBeenCalled();
  });

  it("不一致・ヘッダ無しは401で、サービスを呼ばない", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");

    expect((await GET(request({ authorization: "Bearer wrong" }))).status).toBe(
      401,
    );
    expect((await GET(request({ "x-cron-secret": "wrong" }))).status).toBe(401);
    expect((await GET(request())).status).toBe(401);
    expect(runLogRetention).not.toHaveBeenCalled();
  });

  it("x-cron-secret と Bearer のどちらでも200で結果を返す", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runLogRetention).mockResolvedValue(result());

    const a = await GET(request({ "x-cron-secret": "correct-secret" }));
    const b = await GET(request({ authorization: "Bearer correct-secret" }));

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(await a.json()).toEqual(result());
    expect(runLogRetention).toHaveBeenCalledTimes(2);
  });

  it("dryRun未指定は本削除（dryRun:false）", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runLogRetention).mockResolvedValue(result());

    await GET(request({ "x-cron-secret": "correct-secret" }));
    expect(runLogRetention).toHaveBeenLastCalledWith(expect.any(Date), {
      dryRun: false,
    });
  });

  it.each([
    "1",
    "true",
    "TRUE",
    "True",
    "yes",
    "on",
    "",
    "xyz",
    "%20",
    "%20FALSE%20x",
    "0%00",
    "%EF%BC%90",
  ])("?dryRun=%s はdryRunとして渡す（GET・POST）", async (value) => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runLogRetention).mockResolvedValue(result());
    const headers = { "x-cron-secret": "correct-secret" };
    const search = `?dryRun=${value}`;

    await GET(request(headers, search));
    expect(runLogRetention).toHaveBeenLastCalledWith(expect.any(Date), {
      dryRun: true,
    });

    await POST(request(headers, search));
    expect(runLogRetention).toHaveBeenLastCalledWith(expect.any(Date), {
      dryRun: true,
    });
  });

  it.each(["0", "false", "FALSE", "False", "%20false%20"])(
    "?dryRun=%s は本削除（GET・POST）",
    async (value) => {
      vi.stubEnv("CRON_SECRET", "correct-secret");
      vi.mocked(runLogRetention).mockResolvedValue(result());
      const headers = { "x-cron-secret": "correct-secret" };
      const search = `?dryRun=${value}`;

      await GET(request(headers, search));
      expect(runLogRetention).toHaveBeenLastCalledWith(expect.any(Date), {
        dryRun: false,
      });

      await POST(request(headers, search));
      expect(runLogRetention).toHaveBeenLastCalledWith(expect.any(Date), {
        dryRun: false,
      });
    },
  );

  it.each([
    ["?dryRun=0&dryRun=1", true],
    ["?dryRun=1&dryRun=0", true],
    ["?dryRun=false&dryRun=", true],
    ["?dryRun=0&dryRun=false", false],
  ])("複数指定 %s は dryRun=%s（GET・POST）", async (search, expected) => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runLogRetention).mockResolvedValue(result());
    const headers = { "x-cron-secret": "correct-secret" };

    await GET(request(headers, search));
    expect(runLogRetention).toHaveBeenLastCalledWith(expect.any(Date), {
      dryRun: expected,
    });

    await POST(request(headers, search));
    expect(runLogRetention).toHaveBeenLastCalledWith(expect.any(Date), {
      dryRun: expected,
    });
  });

  it("いずれかのテーブルにerrorがあれば500・固定文言（詳細は出さない）", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runLogRetention).mockResolvedValue(
      result({
        tables: {
          authEvent: { deleted: 0, hasMore: false, error: "Error:P2010" },
          loginThrottle: { deleted: 1, hasMore: false },
          announcementNotificationLog: { deleted: 1, hasMore: false },
        },
      }),
    );
    vi.spyOn(logger, "error").mockImplementation(() => {});

    const response = await GET(request({ "x-cron-secret": "correct-secret" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Log retention run failed",
    });
  });

  it("例外は500・固定文言で、詳細はサーバーログのみ", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runLogRetention).mockRejectedValue(
      new Error("ECONNREFUSED user@example.com"),
    );
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    const response = await GET(request({ "x-cron-secret": "correct-secret" }));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain("user@example.com");
    expect(JSON.stringify(errorSpy.mock.calls)).toContain("ECONNREFUSED");
  });
});

describe("POST /api/cron/log-retention", () => {
  it("GETと同様に認証・実行できる", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runLogRetention).mockResolvedValue(result());

    const response = await POST(
      request({ authorization: "Bearer correct-secret" }),
    );

    expect(response.status).toBe(200);
  });
});
