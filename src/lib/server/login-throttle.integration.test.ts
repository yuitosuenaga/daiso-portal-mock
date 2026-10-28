// 実PostgreSQLでの並列ログイン失敗の統合テスト。
// THROTTLE_TEST_DATABASE_URL（使い捨てローカルDB。事前に prisma migrate deploy 済み）がある時のみ実行する。
// 例: docker run -d -e POSTGRES_PASSWORD=test -p 5599:5432 postgres:16
//     DATABASE_URL=postgresql://postgres:test@localhost:5599/postgres npx prisma migrate deploy
//     THROTTLE_TEST_DATABASE_URL=同URL npx vitest run login-throttle.integration
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient, type AuthEventType } from "@prisma/client";

const url = process.env.THROTTLE_TEST_DATABASE_URL;
const testPrisma = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
// セッションTimeZone=Asia/Tokyo の接続（生SQLの日時がセッションTZに依存しないことの検証用）
const tokyoUrl = url
  ? `${url}${url.includes("?") ? "&" : "?"}options=-c%20TimeZone%3DAsia%2FTokyo`
  : null;
const tokyoPrisma = tokyoUrl ? new PrismaClient({ datasources: { db: { url: tokyoUrl } } }) : null;
// vi.mock の getter が返すクライアント（テストごとに切り替える）
let active = testPrisma;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return active;
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.45" }),
}));

import { MAX_FAILED_ATTEMPTS } from "@/lib/auth/login-throttle-policy";
import { hashIdentifier } from "@/lib/server/auth-audit";
import { runProtectedCredentialsLogin } from "@/lib/server/login-throttle";

const EMAIL = "concurrent@example.com";
const KEY = `applicant:${hashIdentifier(EMAIL)}`;

describe.skipIf(!url)("LoginThrottle 並列実行（実DB）", () => {
  beforeAll(() => {
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
  });
  beforeEach(async () => {
    active = testPrisma;
    await testPrisma!.loginThrottle.deleteMany({ where: { key: KEY } });
    await testPrisma!.authEvent.deleteMany({
      where: { identifierHash: hashIdentifier(EMAIL) },
    });
  });
  afterAll(async () => {
    await testPrisma?.$disconnect();
    await tokyoPrisma?.$disconnect();
  });

  const fail = () => runProtectedCredentialsLogin("applicant", EMAIL, async () => null);
  const row = () => testPrisma!.loginThrottle.findUniqueOrThrow({ where: { key: KEY } });
  const lockedEvents = () =>
    testPrisma!.authEvent.count({
      where: { identifierHash: hashIdentifier(EMAIL), type: "login_locked" },
    });

  it("同一メールへの20並列失敗でも件数を取りこぼさず、ロックが成立する", async () => {
    await Promise.all(Array.from({ length: 20 }, fail));
    const r = await row();
    expect(r.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    expect(r.failedCount).toBe(0);
    expect(await lockedEvents()).toBe(1);
  });

  it("閾値-1回の並列失敗では、ちょうどその回数が数えられロックされない", async () => {
    await Promise.all(Array.from({ length: MAX_FAILED_ATTEMPTS - 1 }, fail));
    const r = await row();
    expect(r.failedCount).toBe(MAX_FAILED_ATTEMPTS - 1);
    expect(r.lockedUntil).toBeNull();
  });

  it("ちょうど閾値回の並列失敗でロックが1回だけ成立する", async () => {
    await Promise.all(Array.from({ length: MAX_FAILED_ATTEMPTS }, fail));
    expect((await row()).lockedUntil).not.toBeNull();
    expect(await lockedEvents()).toBe(1);
  });

  it("ロック期限切れ後は1回目から数え直す", async () => {
    await testPrisma!.loginThrottle.create({
      data: {
        key: KEY,
        failedCount: 0,
        lastFailedAt: new Date(Date.now() - 30 * 60_000),
        lockedUntil: new Date(Date.now() - 60_000),
      },
    });
    await fail();
    const r = await row();
    expect(r.failedCount).toBe(1);
    expect(r.lockedUntil).toBeNull();
  });

  it("失敗窓を過ぎた古い失敗は数え直す", async () => {
    await testPrisma!.loginThrottle.create({
      data: {
        key: KEY,
        failedCount: MAX_FAILED_ATTEMPTS - 1,
        lastFailedAt: new Date(Date.now() - 30 * 60_000),
      },
    });
    await fail();
    const r = await row();
    expect(r.failedCount).toBe(1);
    expect(r.lockedUntil).toBeNull();
  });

  it("ロック中の失敗は件数・期限を変えない", async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60_000);
    await testPrisma!.loginThrottle.create({
      data: { key: KEY, failedCount: 0, lastFailedAt: new Date(), lockedUntil },
    });
    await Promise.all(Array.from({ length: 5 }, fail));
    const r = await row();
    expect(r.lockedUntil!.getTime()).toBe(lockedUntil.getTime());
    expect(r.failedCount).toBe(0);
  });

  describe("照合前の予約（並列すり抜け防止）", () => {
    const eventCount = (type: AuthEventType) =>
      testPrisma!.authEvent.count({
        where: { identifierHash: hashIdentifier(EMAIL), type },
      });
    const slow = (counter: { fn: ReturnType<typeof vi.fn> }, result: unknown) =>
      counter.fn.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 30));
        return result;
      });

    it("10並列の失敗でも照合（authorize）はちょうど5回まで", async () => {
      const authorize = vi.fn();
      slow({ fn: authorize }, null);
      await Promise.all(
        Array.from({ length: 10 }, () => runProtectedCredentialsLogin("applicant", EMAIL, authorize))
      );
      expect(authorize).toHaveBeenCalledTimes(MAX_FAILED_ATTEMPTS);
      const r = await row();
      expect(r.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
      expect(r.failedCount).toBe(0);
      expect(await eventCount("login_failure")).toBe(5);
      expect(await eventCount("login_blocked")).toBe(5);
      expect(await eventCount("login_locked")).toBe(1);
    });

    it("10並列のうち1件だけ正解でも、照合は5回以下で、成功時は行が消えるか成功後の予約分だけが残る", async () => {
      let n = 0;
      const authorize = vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 30));
        n += 1;
        return n === 3 ? { id: "u1" } : null;
      });
      const results = await Promise.all(
        Array.from({ length: 10 }, () => runProtectedCredentialsLogin("applicant", EMAIL, authorize))
      );
      expect(authorize.mock.calls.length).toBeLessThanOrEqual(MAX_FAILED_ATTEMPTS);
      expect(results.filter(Boolean)).toHaveLength(1);
      const r = await testPrisma!.loginThrottle.findUnique({ where: { key: KEY } });
      if (r) {
        // 成功後に予約された分（失敗扱い）だけが残る
        expect(r.failedCount).toBeLessThanOrEqual(MAX_FAILED_ATTEMPTS - 1);
      }
    });
  });

  describe("セッションTimeZone=Asia/Tokyo でも日時がずれない", () => {
    beforeEach(() => {
      active = tokyoPrisma;
    });

    it("セッションのTimeZoneがAsia/Tokyoである（設定が反映されている）", async () => {
      const rows = await tokyoPrisma!.$queryRaw<{ TimeZone: string }[]>`SHOW TimeZone`;
      expect(rows[0].TimeZone).toBe("Asia/Tokyo");
    });

    it("ロック中（今+10分）の試行はblockedになり、authorizeは呼ばれない", async () => {
      await testPrisma!.loginThrottle.create({
        data: {
          key: KEY,
          failedCount: 0,
          lastFailedAt: new Date(),
          lockedUntil: new Date(Date.now() + 10 * 60_000),
        },
      });
      const authorize = vi.fn().mockResolvedValue({ id: "u1" });
      const result = await runProtectedCredentialsLogin("applicant", EMAIL, authorize);
      expect(result).toBeNull();
      expect(authorize).not.toHaveBeenCalled();
    });

    it("failedCount=4・lastFailedAt=今-1分の次の失敗でロックが成立し、lockedUntilは今+15分", async () => {
      await testPrisma!.loginThrottle.create({
        data: {
          key: KEY,
          failedCount: MAX_FAILED_ATTEMPTS - 1,
          lastFailedAt: new Date(Date.now() - 60_000),
        },
      });
      await fail();
      const r = await row();
      expect(r.failedCount).toBe(0);
      const diff = r.lockedUntil!.getTime() - Date.now();
      expect(Math.abs(diff - 15 * 60_000)).toBeLessThan(10_000);
      expect(await lockedEvents()).toBe(1);
    });

    it("窓の境界: lastFailedAt=今-14分なら継続、今-16分なら数え直す", async () => {
      await testPrisma!.loginThrottle.create({
        data: {
          key: KEY,
          failedCount: 2,
          lastFailedAt: new Date(Date.now() - 14 * 60_000),
        },
      });
      await fail();
      expect((await row()).failedCount).toBe(3);

      await testPrisma!.loginThrottle.update({
        where: { key: KEY },
        data: { failedCount: 2, lastFailedAt: new Date(Date.now() - 16 * 60_000) },
      });
      await fail();
      expect((await row()).failedCount).toBe(1);
    });
  });
});
