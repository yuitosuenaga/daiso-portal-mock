import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

function notFoundPrismaError() {
  return new Prisma.PrismaClientKnownRequestError("Record to update not found.", {
    code: "P2025",
    clientVersion: "test",
  });
}

const {
  companyCreateMock,
  companyFindManyMock,
  companyFindUniqueMock,
  companyFindFirstMock,
  companyUpdateMock,
  announcementRecipientCreateMock,
  applicantUserUpdateManyMock,
  transactionMock,
} = vi.hoisted(() => {
  const companyCreateMock = vi.fn();
  const companyFindManyMock = vi.fn();
  const companyFindUniqueMock = vi.fn();
  const companyFindFirstMock = vi.fn();
  const companyUpdateMock = vi.fn();
  const announcementRecipientCreateMock = vi.fn();
  const applicantUserUpdateManyMock = vi.fn();

  // `createCompany`/`createCompaniesBulk`は`prisma.$transaction(async (tx) => {...})`
  // （インタラクティブトランザクション）を使うため、`tx`にはモック済みの
  // `company`/`announcementRecipient`をそのまま渡す。呼び出し検証はトップレベルの
  // `prisma.company.create`等と同じモック関数に対して行える。
  const transactionMock = vi.fn(
    async (callback: (tx: { company: { create: typeof companyCreateMock }; announcementRecipient: { create: typeof announcementRecipientCreateMock } }) => unknown) =>
      callback({
        company: { create: companyCreateMock },
        announcementRecipient: { create: announcementRecipientCreateMock },
      })
  );

  return {
    companyCreateMock,
    companyFindManyMock,
    companyFindUniqueMock,
    companyFindFirstMock,
    companyUpdateMock,
    announcementRecipientCreateMock,
    applicantUserUpdateManyMock,
    transactionMock,
  };
});

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    company: {
      findMany: companyFindManyMock,
      findUnique: companyFindUniqueMock,
      findFirst: companyFindFirstMock,
      create: companyCreateMock,
      update: companyUpdateMock,
    },
    announcementRecipient: {
      create: announcementRecipientCreateMock,
    },
    applicantUser: {
      updateMany: applicantUserUpdateManyMock,
    },
    $transaction: transactionMock,
  },
}));

import { getSession } from "@/lib/server/get-session";
import { prisma } from "@/lib/db/prisma";
import {
  CompanyNotFoundError,
  createCompaniesBulk,
  createCompany,
  deactivateApplicantUsersByCompanies,
  findExistingCompanyCodes,
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
  it("name昇順・applicantUserCount/activeApplicantUserCount付きで全社を取得する（要件20.4）", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      {
        ...baseCompanyRecord({ id: "1", name: "Alpha Co." }),
        _count: { applicantUsers: 3 },
        applicantUsers: [{ id: "a" }, { id: "b" }],
      },
      {
        ...baseCompanyRecord({ id: "2", name: "Beta Co." }),
        _count: { applicantUsers: 0 },
        applicantUsers: [],
      },
    ] as never);

    const result = await listCompaniesForManagement();

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { applicantUsers: true } },
        applicantUsers: { where: { isActive: true }, select: { id: true } },
      },
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: "1",
        name: "Alpha Co.",
        applicantUserCount: 3,
        activeApplicantUserCount: 2,
      }),
      expect.objectContaining({
        id: "2",
        name: "Beta Co.",
        applicantUserCount: 0,
        activeApplicantUserCount: 0,
      }),
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

  it("Companyの作成とAnnouncementRecipient（代表1件）の作成を1トランザクションで行う（要件12.1〜12.3）", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.create).mockResolvedValue(
      baseCompanyRecord({
        id: "company-new",
        name: "新規会社",
        country: "TH",
        companyCode: "TH-100",
      }) as never
    );
    vi.mocked(prisma.announcementRecipient.create).mockResolvedValue({
      id: "recipient-new",
      companyId: "company-new",
      contactName: "新規会社",
    } as never);

    const result = await createCompany({
      name: "新規会社",
      country: "TH",
      companyCode: "TH-100",
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.company.create).toHaveBeenCalledWith({
      data: { name: "新規会社", country: "TH", companyCode: "TH-100" },
    });
    // `AnnouncementRecipient`は作成された`Company`のidに紐付け、`contactName`は
    // 会社名（`input.name`）を既定値とする（要件12.3）。
    expect(prisma.announcementRecipient.create).toHaveBeenCalledWith({
      data: { companyId: "company-new", contactName: "新規会社" },
    });
    // 既存の`createCompanyAction`呼び出し元から見た戻り値（`Company`）は変わらない。
    expect(result).toEqual({
      id: "company-new",
      name: "新規会社",
      country: "TH",
      companyCode: "TH-100",
      createdAt: expect.any(String),
    });
  });

  it("AnnouncementRecipientの作成が失敗した場合、Companyの作成もロールバックされる（要件12.2）", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.create).mockResolvedValue(
      baseCompanyRecord({ id: "company-new", name: "新規会社" }) as never
    );
    vi.mocked(prisma.announcementRecipient.create).mockRejectedValue(
      new Error("db error")
    );

    await expect(
      createCompany({ name: "新規会社", country: "TH", companyCode: "TH-100" })
    ).rejects.toThrow("db error");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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

describe("findExistingCompanyCodes", () => {
  it("既存Companyに存在する販社コードのみを返す（要件19.7）", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      { companyCode: "th-daiso-thailand" },
      { companyCode: "vn-daiso-vietnam" },
    ] as never);

    const result = await findExistingCompanyCodes([
      "th-daiso-thailand",
      "vn-daiso-vietnam",
      "jp-daiso-japan",
    ]);

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: { companyCode: { in: ["th-daiso-thailand", "vn-daiso-vietnam", "jp-daiso-japan"] } },
      select: { companyCode: true },
    });
    expect(result).toEqual(["th-daiso-thailand", "vn-daiso-vietnam"]);
  });

  it("空配列を渡したときPrismaを呼び出さず空配列を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    const result = await findExistingCompanyCodes([]);

    expect(prisma.company.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("申請者セッションの場合は例外を送出し、Prismaを呼び出さない（多層防御）", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(findExistingCompanyCodes(["th-daiso-thailand"])).rejects.toThrow();
    expect(prisma.company.findMany).not.toHaveBeenCalled();
  });
});

describe("createCompaniesBulk", () => {
  it("全社のCompanyとAnnouncementRecipientを1トランザクションで作成する（要件19.9, 19.10）", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.create)
      .mockResolvedValueOnce(
        baseCompanyRecord({ id: "1", name: "Daiso Thailand", country: "TH", companyCode: "th-daiso-thailand" }) as never
      )
      .mockResolvedValueOnce(
        baseCompanyRecord({ id: "2", name: "Daiso Vietnam", country: "VN", companyCode: "vn-daiso-vietnam" }) as never
      );
    // 別テスト（AnnouncementRecipientの作成が失敗した場合）が`mockRejectedValue`
    // （persistent）を設定しているため、ここで明示的に成功へ上書きする。
    vi.mocked(prisma.announcementRecipient.create).mockResolvedValue({
      id: "recipient",
      companyId: "1",
      contactName: "Daiso Thailand",
    } as never);

    const result = await createCompaniesBulk([
      { name: "Daiso Thailand", country: "TH", companyCode: "th-daiso-thailand" },
      { name: "Daiso Vietnam", country: "VN", companyCode: "vn-daiso-vietnam" },
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.company.create).toHaveBeenCalledTimes(2);
    expect(prisma.announcementRecipient.create).toHaveBeenCalledTimes(2);
    expect(prisma.announcementRecipient.create).toHaveBeenNthCalledWith(1, {
      data: { companyId: "1", contactName: "Daiso Thailand" },
    });
    expect(prisma.announcementRecipient.create).toHaveBeenNthCalledWith(2, {
      data: { companyId: "2", contactName: "Daiso Vietnam" },
    });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("2");
  });

  it("途中の1件が失敗した場合、全体がロールバックされる（例外がそのまま伝播する）", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.company.create).mockResolvedValueOnce(
      baseCompanyRecord({ id: "1" }) as never
    );
    vi.mocked(prisma.announcementRecipient.create).mockRejectedValueOnce(
      new Error("db error")
    );

    await expect(
      createCompaniesBulk([
        { name: "Daiso Thailand", country: "TH", companyCode: "th-daiso-thailand" },
        { name: "Daiso Vietnam", country: "VN", companyCode: "vn-daiso-vietnam" },
      ])
    ).rejects.toThrow("db error");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // 2件目のcompany.createは呼ばれない（1件目のAnnouncementRecipient作成失敗で中断）
    expect(prisma.company.create).toHaveBeenCalledTimes(1);
  });

  it("空配列のときPrisma/トランザクションを呼び出さず空配列を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    const result = await createCompaniesBulk([]);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("申請者セッションの場合は例外を送出し、トランザクションを呼び出さない（多層防御）", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(
      createCompaniesBulk([
        { name: "Daiso Thailand", country: "TH", companyCode: "th-daiso-thailand" },
      ])
    ).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("deactivateApplicantUsersByCompanies", () => {
  it("選択会社に所属する有効なApplicantUserのみをisActive=falseに更新する（要件20.2, 20.5, 20.6）", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.applicantUser.updateMany).mockResolvedValue({ count: 5 });

    const result = await deactivateApplicantUsersByCompanies(["company-1", "company-2"]);

    expect(prisma.applicantUser.updateMany).toHaveBeenCalledWith({
      where: { companyId: { in: ["company-1", "company-2"] }, isActive: true },
      data: { isActive: false },
    });
    expect(result).toEqual({ deactivatedCount: 5 });
  });

  it("既に無効なApplicantUserは対象外となり冪等に扱われる（whereにisActive:trueを含む）", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(prisma.applicantUser.updateMany).mockResolvedValue({ count: 0 });

    const result = await deactivateApplicantUsersByCompanies(["company-1"]);

    expect(result).toEqual({ deactivatedCount: 0 });
  });

  it("companyIdsが空配列のときPrismaを呼び出さずdeactivatedCount:0を返す（防御）", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    const result = await deactivateApplicantUsersByCompanies([]);

    expect(prisma.applicantUser.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({ deactivatedCount: 0 });
  });

  it("申請者セッションの場合は例外を送出し、Prismaを呼び出さない（多層防御）", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(
      deactivateApplicantUsersByCompanies(["company-1"])
    ).rejects.toThrow();
    expect(prisma.applicantUser.updateMany).not.toHaveBeenCalled();
  });
});
