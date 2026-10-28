import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth-session", () => {
  class UnauthorizedSessionError extends Error {}
  class ForbiddenSessionError extends UnauthorizedSessionError {}
  return {
    UnauthorizedSessionError,
    ForbiddenSessionError,
    requireHelpdeskAdminSession: vi.fn(),
  };
});
vi.mock("@/lib/server/helpdesk-staff-service", () => ({ listHelpdeskStaff: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  errorFields: vi.fn(() => ({})),
}));

import { GET } from "@/app/api/helpdesk/staff/export/route";
import { parseCsv } from "@/lib/csv";
import {
  ForbiddenSessionError,
  UnauthorizedSessionError,
  requireHelpdeskAdminSession,
} from "@/lib/server/auth-session";
import { listHelpdeskStaff } from "@/lib/server/helpdesk-staff-service";
import { logger } from "@/lib/server/logger";

const staff = [
  {
    id: "s1",
    email: "admin@example.com",
    displayName: "管理者",
    role: "admin" as const,
    registrationSource: "seed" as const,
    isActive: true,
    createdAt: "2026-01-02T03:04:05.000Z",
  },
  {
    id: "s2",
    email: "member@example.com",
    displayName: "=cmd|' /C calc'!A0",
    role: "member" as const,
    registrationSource: "manual" as const,
    isActive: false,
    createdAt: "2026-02-03T04:05:06.000Z",
  },
];

async function body(res: Response): Promise<string> {
  return await res.text();
}

describe("GET /api/helpdesk/staff/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireHelpdeskAdminSession).mockResolvedValue({
      claims: { staffId: "s1", id: "s1" },
    } as never);
    vi.mocked(listHelpdeskStaff).mockResolvedValue(staff);
  });

  it("adminには200でCSVを返す(ヘッダ・BOM・列順)", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(res.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="helpdesk-staff-\d{8}\.csv"$/
    );
    // res.text()はBOMを除去するため、バイト列で確認する
    const bytes = new Uint8Array(await res.clone().arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const text = await body(res);
    expect(text).toContain("\r\n");
    const rows = parseCsv(text);
    expect(rows[0]).toEqual([
      "email",
      "displayName",
      "role",
      "isActive",
      "registrationSource",
      "createdAt",
    ]);
    expect(rows[1]).toEqual([
      "admin@example.com",
      "管理者",
      "admin",
      "true",
      "seed",
      "2026-01-02T03:04:05.000Z",
    ]);
    expect(rows[2][2]).toBe("member");
    expect(rows[2][3]).toBe("false");
    expect(rows).toHaveLength(3);
    expect(text.toLowerCase()).not.toContain("passwordhash");
  });

  it("数式で始まる表示名は先頭に ' が付く", async () => {
    const rows = parseCsv(await body(await GET()));
    expect(rows[2][1]).toBe("'=cmd|' /C calc'!A0");
  });

  it("監査ログにはoperatorIdと件数のみ(メール・表示名を出さない)", async () => {
    await GET();
    expect(logger.info).toHaveBeenCalledWith("helpdesk staff exported", {
      operatorId: "s1",
      count: 2,
    });
  });

  it("admin以外は404(no-store)", async () => {
    vi.mocked(requireHelpdeskAdminSession).mockRejectedValue(new ForbiddenSessionError("x"));
    const res = await GET();
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ error: "Not Found" });
    expect(listHelpdeskStaff).not.toHaveBeenCalled();
  });

  it("未ログインは401(no-store)", async () => {
    vi.mocked(requireHelpdeskAdminSession).mockRejectedValue(new UnauthorizedSessionError("x"));
    const res = await GET();
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("Content-Disposition の日付はJST(UTC 16:00 は翌日)", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T16:00:00Z"));
      const res = await GET();
      expect(res.headers.get("Content-Disposition")).toBe(
        'attachment; filename="helpdesk-staff-20260102.csv"'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("想定外の例外は500(no-store)", async () => {
    vi.mocked(listHelpdeskStaff).mockRejectedValue(new Error("boom"));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
