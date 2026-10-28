import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { prisma } from "@/lib/db/prisma";
import {
  findApplicantUserIdsByEmail,
  findHelpdeskStaffIdsByEmail,
} from "@/lib/server/email-lookup";

type Sql = { strings: string[]; values: unknown[] };

beforeEach(() => {
  vi.mocked(prisma.$queryRaw).mockReset();
});

describe("メール照会ヘルパー", () => {
  it("申請者: 入力を正規化して`lower(email) = $1`で照会し、idの配列を返す（LIKE/ILIKEは使わない）", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: "a" }, { id: "b" }]);

    const ids = await findApplicantUserIdsByEmail("  A_B@X.com ");

    expect(ids).toEqual(["a", "b"]);
    const sql = vi.mocked(prisma.$queryRaw).mock.calls[0][0] as unknown as Sql;
    expect(sql.values).toEqual(["a_b@x.com"]);
    expect(sql.strings.join("?")).toContain("lower(email) = ?");
    expect(sql.strings.join("?").toLowerCase()).not.toContain("like");
  });

  it("申請者: excludeIdがあれば自分自身を除外する条件が付く", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    await findApplicantUserIdsByEmail("a@x.com", { excludeId: "self" });

    const sql = vi.mocked(prisma.$queryRaw).mock.calls[0][0] as unknown as Sql;
    expect(sql.values).toEqual(["a@x.com", "self"]);
    expect(sql.strings.join("?")).toContain("id <> ?");
  });

  it("スタッフ: 入力を正規化して`lower(email) = $1`で照会する", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: "s" }]);

    expect(await findHelpdeskStaffIdsByEmail("S@X.com")).toEqual(["s"]);
    const sql = vi.mocked(prisma.$queryRaw).mock.calls[0][0] as unknown as Sql;
    expect(sql.values).toEqual(["s@x.com"]);
    expect(sql.strings.join("?")).toContain('"HelpdeskStaff"');
  });
});
