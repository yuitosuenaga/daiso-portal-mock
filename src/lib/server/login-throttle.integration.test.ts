// 実PostgreSQLでの並列ログイン失敗の統合テスト。
// THROTTLE_TEST_DATABASE_URL（使い捨てローカルDB。事前に prisma migrate deploy 済み）がある時のみ実行する。
// 例: docker run -d -e POSTGRES_PASSWORD=test -p 5599:5432 postgres:16
//     DATABASE_URL=postgresql://postgres:test@localhost:5599/postgres npx prisma migrate deploy
//     THROTTLE_TEST_DATABASE_URL=同URL npx vitest run login-throttle.integration
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

const url = process.env.THROTTLE_TEST_DATABASE_URL;
const testPrisma = url ? new PrismaClient({ datasources: { db: { url } } }) : null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return testPrisma;
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
    await testPrisma!.loginThrottle.deleteMany({ where: { key: KEY } });
    await testPrisma!.authEvent.deleteMany({
      where: { identifierHash: hashIdentifier(EMAIL) },
    });
  });
  afterAll(async () => {
    await testPrisma?.$disconnect();
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
});
