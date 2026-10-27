// 実PostgreSQLでの同時降格・同時無効化の統合テスト（有効なadminが0人にならないこと）。
// STAFF_TEST_DATABASE_URL（使い捨てローカルDB。スキーマ適用済み）がある時のみ実行する。
// 例: docker run -d -e POSTGRES_PASSWORD=test -p 5599:5432 postgres:16
//     DATABASE_URL=postgresql://postgres:test@localhost:5599/postgres npx prisma db push
//     STAFF_TEST_DATABASE_URL=同URL npx vitest run helpdesk-staff-service.integration
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

const url = process.env.STAFF_TEST_DATABASE_URL;
const testPrisma = url ? new PrismaClient({ datasources: { db: { url } } }) : null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return testPrisma;
  },
}));

const requireAdminMock = vi.fn();
vi.mock("@/lib/server/auth-session", () => {
  class ForbiddenSessionError extends Error {}
  return {
    ForbiddenSessionError,
    requireHelpdeskAdminSession: (...a: unknown[]) => requireAdminMock(...a),
  };
});

import {
  setHelpdeskStaffActive,
  setHelpdeskStaffRole,
} from "@/lib/server/helpdesk-staff-service";

const EMAIL_A = "staff-it-a@example.com";
const EMAIL_B = "staff-it-b@example.com";

function actAs(staffId: string) {
  return { claims: { id: staffId, role: "helpdesk", staffId } };
}

describe.skipIf(!url)("スタッフのロール変更・無効化の並列実行（実DB）", () => {
  let idA = "";
  let idB = "";

  beforeEach(async () => {
    // 他のadminが存在すると検査対象が変わるため、使い捨てDB前提で全スタッフを入れ替える。
    await testPrisma!.helpdeskStaff.deleteMany({});
    const a = await testPrisma!.helpdeskStaff.create({
      data: { email: EMAIL_A, displayName: "A", role: "admin", isActive: true },
    });
    const b = await testPrisma!.helpdeskStaff.create({
      data: { email: EMAIL_B, displayName: "B", role: "admin", isActive: true },
    });
    idA = a.id;
    idB = b.id;
  });

  afterAll(async () => {
    await testPrisma?.$disconnect();
  });

  const activeAdmins = () =>
    testPrisma!.helpdeskStaff.count({ where: { role: "admin", isActive: true } });

  it("2人のadminが互いを同時に降格しても、有効なadminは0人にならない", async () => {
    requireAdminMock
      .mockResolvedValueOnce(actAs(idA))
      .mockResolvedValueOnce(actAs(idB));

    const results = await Promise.allSettled([
      setHelpdeskStaffRole(idB, "member"),
      setHelpdeskStaffRole(idA, "member"),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await activeAdmins()).toBe(1);
  });

  it("2人のadminが互いを同時に無効化しても、有効なadminは0人にならない", async () => {
    requireAdminMock
      .mockResolvedValueOnce(actAs(idA))
      .mockResolvedValueOnce(actAs(idB));

    const results = await Promise.allSettled([
      setHelpdeskStaffActive(idB, false),
      setHelpdeskStaffActive(idA, false),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await activeAdmins()).toBe(1);
  });
});
