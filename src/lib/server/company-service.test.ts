import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

function notFoundPrismaError() {
  return new Prisma.PrismaClientKnownRequestError("Record to update not found.", {
    code: "P2025",
    clientVersion: "test",
  });
}

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    company: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { getSession } from "@/lib/server/get-session";
import { prisma } from "@/lib/db/prisma";
import {
  CompanyNotFoundError,
  createCompany,
  getCompanyById,
  isCompanyCodeTaken,
  listCompaniesForHelpdesk,
  listCompaniesForManagement,
  updateCompany,
} from "@/lib/server/company-service";

function baseCompanyRecord(
  overrides: Partial<{
    id: string;
    name: string;
    country: string;
    companyCode: string;
    createdAt: Date;
  }> = {}
) {
  return {
    id: "company-1",
    name: "Alpha Co.",
    country: "JP",
    companyCode: "JP-001",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

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

describe("listCompaniesForManagement", () => {
  it("name昇順・applicantUserCount付きで全社を取得する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      { ...baseCompanyRecord({ id: "1", name: "Alpha Co." }), _count: { applicantUsers: 3 } },
      { ...baseCompanyRecord({ id: "2", name: "Beta Co." }), _count: { applicantUsers: 0 } },
    ] as never);

    const result = await listCompaniesForManagement();

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      include: { _count: { select: { applicantUsers: true } } },
    });
    expect(result).toEqual([
      expect.objectContaining({ id: "1", name: "Alpha Co.", applicantUserCount: 3 }),
      expect.objectContaining({ id: "2", name: "Beta Co.", applicantUserCount: 0 }),
    ]);
  });

  it("申請者セッションの場合は例外を送出し、Prismaを呼び出さない（多層防御）", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(listCompaniesForManagement()).rejects.toThrow();
    expect(prisma.company.findMany).not.toHaveBeenCalled();
  });
});

describe("getCompanyById", () => {
  it("存在するIDのとき会社情報を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(
      baseCompanyRecord({ id: "1" }) as never
    );

    const result = await getCompanyById("1");

    expect(result?.id).toBe("1");
  });

  it("存在しないIDのときnullを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null);

    const result = await getCompanyById("missing");

    expect(result).toBeNull();
  });
});

describe("createCompany / updateCompany", () => {
  it("入力内容で会社を作成する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.create).mockResolvedValue(
      baseCompanyRecord({ id: "1", name: "新規会社" }) as never
    );

    const result = await createCompany({
      name: "新規会社",
      country: "TH",
      companyCode: "TH-100",
    });

    expect(prisma.company.create).toHaveBeenCalledWith({
      data: { name: "新規会社", country: "TH", companyCode: "TH-100" },
    });
    expect(result.id).toBe("1");
  });

  it("既存の会社情報を更新する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.update).mockResolvedValue(
      baseCompanyRecord({ id: "1", name: "更新後" }) as never
    );

    const result = await updateCompany("1", {
      name: "更新後",
      country: "JP",
      companyCode: "JP-001",
    });

    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { name: "更新後", country: "JP", companyCode: "JP-001" },
    });
    expect(result.name).toBe("更新後");
  });

  it("存在しないIDの更新はCompanyNotFoundErrorを送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.update).mockRejectedValue(notFoundPrismaError());

    await expect(
      updateCompany("missing", { name: "x", country: "JP", companyCode: "JP-999" })
    ).rejects.toThrow(CompanyNotFoundError);
  });

  it("更新時のDB接続エラー等はCompanyNotFoundErrorに変換せずそのまま送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.update).mockRejectedValue(new Error("connection lost"));

    await expect(
      updateCompany("1", { name: "x", country: "JP", companyCode: "JP-001" })
    ).rejects.toThrow("connection lost");
  });
});

describe("isCompanyCodeTaken", () => {
  it("同じ販社コードの会社が存在するときtrueを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.findFirst).mockResolvedValue(
      baseCompanyRecord() as never
    );

    const result = await isCompanyCodeTaken("JP-001");

    expect(prisma.company.findFirst).toHaveBeenCalledWith({
      where: { companyCode: "JP-001" },
    });
    expect(result).toBe(true);
  });

  it("同じ販社コードの会社が存在しないときfalseを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.findFirst).mockResolvedValue(null);

    const result = await isCompanyCodeTaken("JP-999");

    expect(result).toBe(false);
  });

  it("excludeId指定時は自分自身を除外して重複確認する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.findFirst).mockResolvedValue(null);

    const result = await isCompanyCodeTaken("JP-001", "company-1");

    expect(prisma.company.findFirst).toHaveBeenCalledWith({
      where: { companyCode: "JP-001", id: { not: "company-1" } },
    });
    expect(result).toBe(false);
  });
});
