// 実PostgreSQLでの運用ログ保持期間削除の統合テスト。
// RETENTION_TEST_DATABASE_URL（使い捨てローカルDB。事前に prisma migrate deploy 済み）がある時のみ実行する。
// 例: docker run -d --rm --name ret-pg -p 127.0.0.1:55434:5432 -e POSTGRES_PASSWORD=postgres postgres:16
//     DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55434/postgres npx prisma migrate deploy
//     RETENTION_TEST_DATABASE_URL=同URL npx vitest run log-retention.integration --no-file-parallelism
// 対象3テーブルの行をすべて削除してから始める（使い捨てDB前提）。
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

const url = process.env.RETENTION_TEST_DATABASE_URL;
const testPrisma = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
// セッションTimeZone=Asia/Tokyo の接続（生SQLの日時がセッションTZに依存しないことの検証用）
const tokyoUrl = url
  ? `${url}${url.includes("?") ? "&" : "?"}options=-c%20TimeZone%3DAsia%2FTokyo`
  : null;
const tokyoPrisma = tokyoUrl ? new PrismaClient({ datasources: { db: { url: tokyoUrl } } }) : null;
let active = testPrisma;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return active;
  },
}));

import { MS_PER_DAY, RETENTION_RULES } from "@/lib/log-retention-policy";
import { runLogRetention } from "@/lib/server/log-retention";

const NOW = new Date("2026-10-29T04:00:00.000Z");
const ago = (days: number, extraMs = 0) => new Date(NOW.getTime() - days * MS_PER_DAY - extraMs);

const AUTH_DAYS = RETENTION_RULES.authEvent.retentionDays;
const LOG_DAYS = RETENTION_RULES.announcementNotificationLog.retentionDays;

describe.skipIf(!url)("運用ログ保持期間削除（実DB）", () => {
  let announcementId: string;

  beforeAll(() => {
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
  });
  beforeEach(async () => {
    active = testPrisma;
    await testPrisma!.announcementNotificationLog.deleteMany();
    await testPrisma!.announcement.deleteMany({ where: { title: "retention-test" } });
    await testPrisma!.authEvent.deleteMany();
    await testPrisma!.loginThrottle.deleteMany();
    const a = await testPrisma!.announcement.create({
      data: { title: "retention-test", body: "b", category: "other" },
    });
    announcementId = a.id;
  });
  afterAll(async () => {
    await testPrisma?.announcementNotificationLog.deleteMany();
    await testPrisma?.announcement.deleteMany({ where: { title: "retention-test" } });
    await testPrisma?.authEvent.deleteMany();
    await testPrisma?.loginThrottle.deleteMany();
    await testPrisma?.$disconnect();
    await tokyoPrisma?.$disconnect();
  });

  const authEvent = (createdAt: Date) =>
    testPrisma!.authEvent.create({
      data: { type: "login_failure", method: "credentials", portal: "applicant", createdAt },
    });
  const notifLog = (sentAt: Date) =>
    testPrisma!.announcementNotificationLog.create({
      data: {
        announcementId,
        kind: "publish",
        recipientEmail: "a@example.com",
        locale: "ja",
        status: "sent",
        sentAt,
      },
    });
  const throttle = (key: string, updatedAt: Date, lockedUntil: Date | null = null) =>
    testPrisma!.loginThrottle.create({ data: { key, updatedAt, lockedUntil } });

  describe.each([
    ["デフォルト接続", () => testPrisma],
    ["セッションTZ=Asia/Tokyo", () => tokyoPrisma],
  ])("境界（%s）", (_name, client) => {
    it("AuthEvent: cutoffちょうどは残り、1ms前は消える", async () => {
      active = client();
      const keep = await authEvent(ago(AUTH_DAYS));
      const drop = await authEvent(ago(AUTH_DAYS, 1));

      const result = await runLogRetention(NOW);

      expect(result.tables.authEvent).toEqual({ deleted: 1, hasMore: false });
      const ids = (await testPrisma!.authEvent.findMany()).map((e) => e.id);
      expect(ids).toEqual([keep.id]);
      expect(ids).not.toContain(drop.id);
    });

    it("AnnouncementNotificationLog: cutoffちょうどは残り、1ms前は消える", async () => {
      active = client();
      const keep = await notifLog(ago(LOG_DAYS));
      await notifLog(ago(LOG_DAYS, 1));

      const result = await runLogRetention(NOW);

      expect(result.tables.announcementNotificationLog.deleted).toBe(1);
      const ids = (await testPrisma!.announcementNotificationLog.findMany()).map((e) => e.id);
      expect(ids).toEqual([keep.id]);
    });

    it("LoginThrottle: updatedAtがcutoffちょうどは残り、1ms前は消える", async () => {
      active = client();
      await throttle("applicant:keep", ago(1));
      await throttle("applicant:drop", ago(1, 1));

      const result = await runLogRetention(NOW);

      expect(result.tables.loginThrottle.deleted).toBe(1);
      const keys = (await testPrisma!.loginThrottle.findMany()).map((e) => e.key);
      expect(keys).toEqual(["applicant:keep"]);
    });
  });

  it("batchSize=2でも5行すべて削除し、2回目の実行は deleted=0", async () => {
    for (let i = 0; i < 5; i++) await authEvent(ago(AUTH_DAYS + 10 + i));

    const first = await runLogRetention(NOW, { batchSize: 2 });
    const second = await runLogRetention(NOW, { batchSize: 2 });

    expect(first.tables.authEvent).toEqual({ deleted: 5, hasMore: false });
    expect(await testPrisma!.authEvent.count()).toBe(0);
    expect(second.tables.authEvent.deleted).toBe(0);
  });

  it("LoginThrottle: ロック中の行・直近更新の行は残り、ロック期限切れの古い行は消える", async () => {
    await throttle("applicant:locked", ago(10), new Date(NOW.getTime() + 60_000));
    await throttle("applicant:recent", new Date(NOW.getTime() - 60_000));
    await throttle("applicant:expired-lock", ago(10), new Date(NOW.getTime() - 60_000));
    await throttle("applicant:old", ago(10));

    const result = await runLogRetention(NOW);

    expect(result.tables.loginThrottle.deleted).toBe(2);
    const keys = (await testPrisma!.loginThrottle.findMany()).map((e) => e.key).sort();
    expect(keys).toEqual(["applicant:locked", "applicant:recent"]);
  });

  it("当日sentの通知ログ・期間内のログ・Announcement本体は残る", async () => {
    await notifLog(new Date(NOW.getTime() - 60_000));
    await notifLog(ago(LOG_DAYS - 1));
    await notifLog(ago(LOG_DAYS + 1));
    await authEvent(ago(AUTH_DAYS - 1));

    const result = await runLogRetention(NOW);

    expect(result.tables.announcementNotificationLog.deleted).toBe(1);
    expect(await testPrisma!.announcementNotificationLog.count()).toBe(2);
    expect(await testPrisma!.authEvent.count()).toBe(1);
    expect(await testPrisma!.announcement.count({ where: { id: announcementId } })).toBe(1);
  });

  it("dryRunは件数のみ返し、削除しない", async () => {
    await authEvent(ago(AUTH_DAYS + 1));
    await notifLog(ago(LOG_DAYS + 1));

    const result = await runLogRetention(NOW, { dryRun: true });

    expect(result.tables.authEvent.deleted).toBe(1);
    expect(result.tables.announcementNotificationLog.deleted).toBe(1);
    expect(await testPrisma!.authEvent.count()).toBe(1);
    expect(await testPrisma!.announcementNotificationLog.count()).toBe(1);
  });
});
