import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { executeRaw, queryRaw } = vi.hoisted(() => ({
  executeRaw: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { $executeRaw: executeRaw, $queryRaw: queryRaw },
}));

import { RETENTION_RULES } from "@/lib/log-retention-policy";
import { runLogRetention } from "@/lib/server/log-retention";

const NOW = new Date("2026-10-29T04:00:00.000Z");

function sqlOf(call: unknown[]): Prisma.Sql {
  return call[0] as Prisma.Sql;
}

beforeEach(() => {
  vi.restoreAllMocks();
  executeRaw.mockReset();
  queryRaw.mockReset();
});

describe("runLogRetention", () => {
  it("各テーブルを順に削除し、削除件数を返す（1バッチ未満で停止）", async () => {
    executeRaw.mockResolvedValueOnce(3).mockResolvedValueOnce(0).mockResolvedValueOnce(7);

    const result = await runLogRetention(NOW);

    expect(result.dryRun).toBe(false);
    expect(result.tables.authEvent).toEqual({ deleted: 3, hasMore: false });
    expect(result.tables.loginThrottle).toEqual({ deleted: 0, hasMore: false });
    expect(result.tables.announcementNotificationLog).toEqual({ deleted: 7, hasMore: false });
    expect(executeRaw).toHaveBeenCalledTimes(3);
  });

  it("バッチサイズ分削除できた間は繰り返す（1000→1000→3 で3回、最後で停止）", async () => {
    executeRaw
      .mockResolvedValueOnce(1000)
      .mockResolvedValueOnce(1000)
      .mockResolvedValueOnce(3)
      .mockResolvedValue(0);

    const result = await runLogRetention(NOW);

    expect(result.tables.authEvent).toEqual({ deleted: 2003, hasMore: false });
    // authEvent 3回 + 残り2テーブル各1回
    expect(executeRaw).toHaveBeenCalledTimes(5);
  });

  it("DELETEは外側にも条件を重ね、テーブル名・条件がSQLに入る", async () => {
    executeRaw.mockResolvedValue(0);

    await runLogRetention(NOW, { batchSize: 50 });

    const [auth, throttle, notif] = executeRaw.mock.calls.map((c) => sqlOf(c));
    const cutoffAuth = new Date(NOW.getTime() - 365 * 86400000).toISOString();
    expect(auth.sql).toContain('DELETE FROM "AuthEvent"');
    expect(auth.sql.match(/"createdAt" </g)).toHaveLength(2);
    expect(auth.values).toContain(cutoffAuth);
    expect(auth.values).toContain(50);

    expect(throttle.sql).toContain('DELETE FROM "LoginThrottle" WHERE "key" IN');
    expect(throttle.sql.match(/"lockedUntil" IS NULL/g)).toHaveLength(2);
    expect(throttle.sql.match(/"updatedAt" </g)).toHaveLength(2);

    expect(notif.sql).toContain('DELETE FROM "AnnouncementNotificationLog"');
    expect(notif.sql.match(/"sentAt" </g)).toHaveLength(2);
    expect(notif.values).toContain(new Date(NOW.getTime() - 180 * 86400000).toISOString());
  });

  it("締切に達したら打ち切り、hasMore: true", async () => {
    executeRaw.mockResolvedValue(1000);

    const result = await runLogRetention(NOW, { deadlineMs: 0 });

    expect(executeRaw).not.toHaveBeenCalled();
    expect(result.tables.authEvent.hasMore).toBe(true);
    expect(result.tables.loginThrottle.hasMore).toBe(true);
  });

  it("1バッチ実行後に締切を過ぎたらhasMore: true", async () => {
    const t0 = 1_000_000;
    const nowSpy = vi.spyOn(Date, "now");
    // 開始時刻→authEvent1回目の締切判定(未到達)→2回目の締切判定(到達)
    nowSpy.mockReturnValueOnce(t0).mockReturnValueOnce(t0 + 1).mockReturnValue(t0 + 10_000);
    executeRaw.mockResolvedValue(1000);

    const result = await runLogRetention(NOW, { deadlineMs: 5000 });

    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(result.tables.authEvent).toEqual({ deleted: 1000, hasMore: true });
  });

  it("1テーブルが例外でも他テーブルは続行し、errorを記録する（詳細は出さない）", async () => {
    executeRaw
      .mockRejectedValueOnce(Object.assign(new Error("boom user@example.com"), { code: "P2010" }))
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(4);

    const result = await runLogRetention(NOW);

    expect(result.tables.authEvent.error).toBeTruthy();
    expect(result.tables.authEvent.deleted).toBe(0);
    expect(JSON.stringify(result)).not.toContain("user@example.com");
    expect(result.tables.loginThrottle).toEqual({ deleted: 2, hasMore: false });
    expect(result.tables.announcementNotificationLog).toEqual({ deleted: 4, hasMore: false });
  });

  it("dryRunはCOUNTのみでDELETEを呼ばない", async () => {
    queryRaw.mockResolvedValue([{ count: BigInt(12) }]);

    const result = await runLogRetention(NOW, { dryRun: true });

    expect(executeRaw).not.toHaveBeenCalled();
    expect(queryRaw).toHaveBeenCalledTimes(3);
    expect(result.dryRun).toBe(true);
    expect(result.tables.authEvent).toEqual({ deleted: 12, hasMore: false });
  });

  it("保持日数が下限未満の設定なら何も削除せずthrow", async () => {
    const original = RETENTION_RULES.authEvent.retentionDays;
    RETENTION_RULES.authEvent.retentionDays = 29;
    executeRaw.mockResolvedValue(0);
    try {
      await expect(runLogRetention(NOW)).rejects.toThrow(/below the minimum/);
      expect(executeRaw).not.toHaveBeenCalled();
    } finally {
      RETENTION_RULES.authEvent.retentionDays = original;
    }
  });

  it("不正なbatchSizeはthrow", async () => {
    await expect(runLogRetention(NOW, { batchSize: 0 })).rejects.toThrow();
  });
});
