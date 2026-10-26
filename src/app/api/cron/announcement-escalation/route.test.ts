import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/announcement-escalation", () => ({
  runAnnouncementAutoEscalation: vi.fn(),
}));

import type { EscalationRunResult } from "@/lib/server/announcement-escalation";
import { runAnnouncementAutoEscalation } from "@/lib/server/announcement-escalation";
import { GET, POST } from "@/app/api/cron/announcement-escalation/route";

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/cron/announcement-escalation", {
    method: "GET",
    headers,
  });
}

function summary(overrides: Partial<EscalationRunResult> = {}): EscalationRunResult {
  return {
    overdueAnnouncements: 0,
    notifiedRecipients: 0,
    skippedByDedup: 0,
    sentRecipients: 0,
    skippedRecipients: 0,
    failedRecipients: 0,
    failedAnnouncements: 0,
    skippedByLock: false,
    dryRun: false,
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

describe("GET /api/cron/announcement-escalation", () => {
  it("CRON_SECRET未設定の場合は503を返し、中核関数を呼ばない", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(request({ authorization: "Bearer anything" }));

    expect(response.status).toBe(503);
    expect(runAnnouncementAutoEscalation).not.toHaveBeenCalled();
  });

  it("ヘッダー不一致の場合は401を返し、中核関数を呼ばない", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");

    const response = await GET(request({ authorization: "Bearer wrong-secret" }));

    expect(response.status).toBe(401);
    expect(runAnnouncementAutoEscalation).not.toHaveBeenCalled();
  });

  it("Authorizationヘッダーなしの場合は401を返す", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");

    const response = await GET(request());

    expect(response.status).toBe(401);
  });

  it("Authorization: Bearer <secret>が一致する場合は200と要約JSONを返す", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runAnnouncementAutoEscalation).mockResolvedValue(
      summary({ overdueAnnouncements: 2, notifiedRecipients: 3, skippedByDedup: 1 })
    );

    const response = await GET(request({ authorization: "Bearer correct-secret" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      summary({ overdueAnnouncements: 2, notifiedRecipients: 3, skippedByDedup: 1 })
    );
    expect(runAnnouncementAutoEscalation).toHaveBeenCalledTimes(1);
  });

  it("x-cron-secretヘッダーが一致する場合も200を返す", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runAnnouncementAutoEscalation).mockResolvedValue(summary());

    const response = await GET(request({ "x-cron-secret": "correct-secret" }));

    expect(response.status).toBe(200);
  });
});

describe("認証順序（Cloud Scheduler OIDC対応）", () => {
  it("AuthorizationにOIDC IDトークン（無関係なBearer）があっても、x-cron-secretが正しければ200", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runAnnouncementAutoEscalation).mockResolvedValue(summary());

    const response = await GET(
      request({ authorization: "Bearer eyJ.oidc.id-token", "x-cron-secret": "correct-secret" })
    );

    expect(response.status).toBe(200);
  });

  it("x-cron-secretが誤りでBearerが正しい場合も従来どおり200（Bearer単独方式の互換）", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runAnnouncementAutoEscalation).mockResolvedValue(summary());

    const response = await GET(
      request({ authorization: "Bearer correct-secret", "x-cron-secret": "wrong" })
    );

    expect(response.status).toBe(200);
  });

  it("OIDC IDトークンのみ（x-cron-secretなし）は401", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");

    const response = await GET(request({ authorization: "Bearer eyJ.oidc.id-token" }));

    expect(response.status).toBe(401);
    expect(runAnnouncementAutoEscalation).not.toHaveBeenCalled();
  });
});

describe("失敗の可視化・dryRun", () => {
  it("致命的失敗（中核関数がthrow）は500を返し、レスポンス・ログにエラー詳細（PII）を出さない", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runAnnouncementAutoEscalation).mockRejectedValue(
      new Error("connect ECONNREFUSED user@example.com")
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(request({ "x-cron-secret": "correct-secret" }));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain("user@example.com");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("user@example.com");
    errorSpy.mockRestore();
  });

  it("個別の送信失敗は集計して200で返す", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runAnnouncementAutoEscalation).mockResolvedValue(
      summary({ failedRecipients: 2, failedAnnouncements: 1 })
    );

    const response = await GET(request({ "x-cron-secret": "correct-secret" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.failedRecipients).toBe(2);
    expect(body.failedAnnouncements).toBe(1);
  });

  it("?dryRun=1でdryRunオプションを中核関数へ渡す", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runAnnouncementAutoEscalation).mockResolvedValue(summary({ dryRun: true }));

    const response = await GET(
      new NextRequest("http://localhost/api/cron/announcement-escalation?dryRun=1", {
        headers: { "x-cron-secret": "correct-secret" },
      })
    );

    expect(response.status).toBe(200);
    expect(runAnnouncementAutoEscalation).toHaveBeenCalledWith(expect.any(Date), { dryRun: true });
  });

  it("dryRun指定なしはdryRun: falseで実行する", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runAnnouncementAutoEscalation).mockResolvedValue(summary());

    await GET(request({ "x-cron-secret": "correct-secret" }));

    expect(runAnnouncementAutoEscalation).toHaveBeenCalledWith(expect.any(Date), { dryRun: false });
  });
});

describe("POST /api/cron/announcement-escalation", () => {
  it("GETと同様に認証・実行できる", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runAnnouncementAutoEscalation).mockResolvedValue(summary());

    const response = await POST(request({ authorization: "Bearer correct-secret" }));

    expect(response.status).toBe(200);
  });
});
