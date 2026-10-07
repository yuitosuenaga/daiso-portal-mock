import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth-session", () => ({
  requireHelpdeskStaffSession: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    company: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import {
  COMPANY_SEARCH_LIMIT,
  listCompaniesForTargetingByIds,
  searchCompaniesForTargeting,
} from "@/lib/server/company-targeting-service";

function companyRecord(id: string, name: string, activeUsers: number) {
  return {
    id,
    name,
    country: "VN",
    companyCode: `code-${id}`,
    _count: { applicantUsers: activeUsers },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchCompaniesForTargeting", () => {
  it("ヘルプデスクセッションを要求し、会社名・会社コードの部分一致で検索して表示用に変換する", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      companyRecord("c1", "Daiso VN", 3),
    ] as never);

    const result = await searchCompaniesForTargeting("  daiso  ");

    expect(requireHelpdeskStaffSession).toHaveBeenCalled();
    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: "daiso", mode: "insensitive" } },
            { companyCode: { contains: "daiso", mode: "insensitive" } },
          ],
        },
        take: COMPANY_SEARCH_LIMIT,
      })
    );
    expect(result).toEqual([
      { id: "c1", name: "Daiso VN", country: "VN", companyCode: "code-c1", activeUserCount: 3 },
    ]);
  });

  it("空・空白のみ・文字列以外の検索語は検索せず空配列を返す", async () => {
    expect(await searchCompaniesForTargeting("   ")).toEqual([]);
    expect(await searchCompaniesForTargeting(123 as never)).toEqual([]);
    expect(prisma.company.findMany).not.toHaveBeenCalled();
  });

  it("検索語は100文字に切り詰める", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([]);

    await searchCompaniesForTargeting("a".repeat(150));

    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: "a".repeat(100), mode: "insensitive" } },
            { companyCode: { contains: "a".repeat(100), mode: "insensitive" } },
          ],
        },
      })
    );
  });

  it("未認証ならDBを検索せず拒否する", async () => {
    vi.mocked(requireHelpdeskStaffSession).mockRejectedValueOnce(new Error("unauthorized"));

    await expect(searchCompaniesForTargeting("daiso")).rejects.toThrow("unauthorized");
    expect(prisma.company.findMany).not.toHaveBeenCalled();
  });
});

describe("listCompaniesForTargetingByIds", () => {
  it("空配列ならDBを検索しない", async () => {
    expect(await listCompaniesForTargetingByIds([])).toEqual([]);
    expect(prisma.company.findMany).not.toHaveBeenCalled();
  });

  it("IDによる復元は上限200件までに絞って取得する", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([]);
    const ids = Array.from({ length: 250 }, (_, index) => `c${index}`);

    await listCompaniesForTargetingByIds(ids);

    const call = vi.mocked(prisma.company.findMany).mock.calls[0][0] as {
      where: { id: { in: string[] } };
    };
    expect(call.where.id.in).toHaveLength(200);
  });
});
