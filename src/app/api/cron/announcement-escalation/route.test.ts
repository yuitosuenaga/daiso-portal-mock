import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/announcement-escalation", () => ({
  runAnnouncementAutoEscalation: vi.fn(),
}));

import { runAnnouncementAutoEscalation } from "@/lib/server/announcement-escalation";
import { GET, POST } from "@/app/api/cron/announcement-escalation/route";

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/cron/announcement-escalation", {
    method: "GET",
    headers,
  });
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
    vi.mocked(runAnnouncementAutoEscalation).mockResolvedValue({
      overdueAnnouncements: 2,
      notifiedRecipients: 3,
      skippedByDedup: 1,
    });

    const response = await GET(request({ authorization: "Bearer correct-secret" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ overdueAnnouncements: 2, notifiedRecipients: 3, skippedByDedup: 1 });
    expect(runAnnouncementAutoEscalation).toHaveBeenCalledTimes(1);
  });

  it("x-cron-secretヘッダーが一致する場合も200を返す", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runAnnouncementAutoEscalation).mockResolvedValue({
      overdueAnnouncements: 0,
      notifiedRecipients: 0,
      skippedByDedup: 0,
    });

    const response = await GET(request({ "x-cron-secret": "correct-secret" }));

    expect(response.status).toBe(200);
  });
});

describe("POST /api/cron/announcement-escalation", () => {
  it("GETと同様に認証・実行できる", async () => {
    vi.stubEnv("CRON_SECRET", "correct-secret");
    vi.mocked(runAnnouncementAutoEscalation).mockResolvedValue({
      overdueAnnouncements: 0,
      notifiedRecipients: 0,
      skippedByDedup: 0,
    });

    const response = await POST(request({ authorization: "Bearer correct-secret" }));

    expect(response.status).toBe(200);
  });
});
