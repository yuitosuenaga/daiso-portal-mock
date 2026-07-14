import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    company: {
      findMany: vi.fn(),
    },
  },
}));

import { getSession } from "@/lib/server/get-session";
import { prisma } from "@/lib/db/prisma";
import { listCompaniesForHelpdesk } from "@/lib/server/company-service";

const helpdeskSession = {
  claims: {
    id: "staff-1",
    role: "helpdesk" as const,
    staffId: "staff-1",
    displayName: "田中 太郎",
  },
};

const applicantSession = {
  claims: {
    id: "applicant-1",
    role: "applicant" as const,
    applicantUserId: "applicant-1",
    companyId: "company-1",
    companyName: "Test Co.",
    companyCode: "test-co",
    country: "VN",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listCompaniesForHelpdesk", () => {
  it("Prisma経由で全社をname昇順で取得し、id/name/countryに整形する（ヘルプデスクセッション）", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      { id: "1", name: "Alpha Co.", country: "JP" },
      { id: "2", name: "Beta Co.", country: "VN" },
    ] as never);

    const result = await listCompaniesForHelpdesk();

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
    });
    expect(result).toEqual([
      { id: "1", name: "Alpha Co.", country: "JP" },
      { id: "2", name: "Beta Co.", country: "VN" },
    ]);
  });

  it("0件のときは空配列を返す（ヘルプデスクセッション）", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.findMany).mockResolvedValue([]);

    const result = await listCompaniesForHelpdesk();

    expect(result).toEqual([]);
  });

  it("申請者セッションの場合は例外を送出し、Prismaを呼び出さない（多層防御）", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(listCompaniesForHelpdesk()).rejects.toThrow();
    expect(prisma.company.findMany).not.toHaveBeenCalled();
  });

  it("セッションが存在しない場合は例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    await expect(listCompaniesForHelpdesk()).rejects.toThrow();
    expect(prisma.company.findMany).not.toHaveBeenCalled();
  });
});
