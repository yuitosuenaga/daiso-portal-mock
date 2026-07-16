import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

function notFoundPrismaError() {
  return new Prisma.PrismaClientKnownRequestError("Record to update not found.", {
    code: "P2025",
    clientVersion: "test",
  });
}

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (value: string) => `hashed:${value}`),
  },
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    applicantUser: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    helpdeskStaff: {
      findFirst: vi.fn(),
    },
  },
}));

import bcrypt from "bcryptjs";
import { getSession } from "@/lib/server/get-session";
import { prisma } from "@/lib/db/prisma";
import {
  ApplicantUserNotFoundError,
  createApplicantUser,
  getApplicantUserById,
  isApplicantUserEmailTaken,
  listApplicantUsersByCompany,
  setApplicantUserActive,
  updateApplicantUser,
} from "@/lib/server/applicant-user-service";

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

function baseApplicantUserRecord(
  overrides: Partial<{
    id: string;
    email: string;
    displayName: string;
    passwordHash: string;
    companyId: string;
    isActive: boolean;
    createdAt: Date;
  }> = {}
) {
  return {
    id: "applicant-1",
    email: "tanaka@example.com",
    displayName: "田中太郎",
    passwordHash: "existing-hash",
    companyId: "company-1",
    isActive: true,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
});

describe("listApplicantUsersByCompany", () => {
  it("有効なアカウント優先・displayName昇順で取得する", async () => {
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      baseApplicantUserRecord({ id: "1", displayName: "Aさん" }),
      baseApplicantUserRecord({ id: "2", displayName: "Bさん" }),
    ] as never);

    const result = await listApplicantUsersByCompany("company-1");

    expect(prisma.applicantUser.findMany).toHaveBeenCalledWith({
      where: { companyId: "company-1" },
      orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
    });
    expect(result.map((r) => r.id)).toEqual(["1", "2"]);
    expect(result[0]).not.toHaveProperty("passwordHash");
  });

  it("申請者セッションの場合は例外を送出し、Prismaを呼び出さない（多層防御）", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(listApplicantUsersByCompany("company-1")).rejects.toThrow();
    expect(prisma.applicantUser.findMany).not.toHaveBeenCalled();
  });
});

describe("getApplicantUserById", () => {
  it("存在するIDのときApplicantUserSummaryを返す（passwordHashを含まない）", async () => {
    vi.mocked(prisma.applicantUser.findUnique).mockResolvedValue(
      baseApplicantUserRecord({ id: "1" }) as never
    );

    const result = await getApplicantUserById("1");

    expect(result?.id).toBe("1");
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("存在しないIDのときnullを返す", async () => {
    vi.mocked(prisma.applicantUser.findUnique).mockResolvedValue(null);

    const result = await getApplicantUserById("missing");

    expect(result).toBeNull();
  });
});

describe("createApplicantUser", () => {
  it("パスワードをハッシュ化し、isActive: trueで作成する", async () => {
    vi.mocked(prisma.applicantUser.create).mockResolvedValue(
      baseApplicantUserRecord({ id: "1" }) as never
    );

    const result = await createApplicantUser("company-1", {
      email: "tanaka@example.com",
      displayName: "田中太郎",
      password: "password123",
    });

    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
    expect(prisma.applicantUser.create).toHaveBeenCalledWith({
      data: {
        email: "tanaka@example.com",
        displayName: "田中太郎",
        passwordHash: "hashed:password123",
        companyId: "company-1",
        isActive: true,
      },
    });
    expect(result.id).toBe("1");
    expect(result).not.toHaveProperty("passwordHash");
  });
});

describe("updateApplicantUser", () => {
  it("passwordが指定されている場合はハッシュ化してpasswordHashを更新する", async () => {
    vi.mocked(prisma.applicantUser.update).mockResolvedValue(
      baseApplicantUserRecord({ id: "1" }) as never
    );

    await updateApplicantUser("1", {
      email: "tanaka@example.com",
      displayName: "田中太郎",
      password: "newpassword123",
    });

    expect(bcrypt.hash).toHaveBeenCalledWith("newpassword123", 10);
    expect(prisma.applicantUser.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: {
        email: "tanaka@example.com",
        displayName: "田中太郎",
        passwordHash: "hashed:newpassword123",
      },
    });
  });

  it("passwordが未指定の場合は既存のpasswordHashを変更しない", async () => {
    vi.mocked(prisma.applicantUser.update).mockResolvedValue(
      baseApplicantUserRecord({ id: "1" }) as never
    );

    await updateApplicantUser("1", {
      email: "tanaka@example.com",
      displayName: "田中太郎",
    });

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(prisma.applicantUser.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: {
        email: "tanaka@example.com",
        displayName: "田中太郎",
      },
    });
  });

  it("存在しないIDの更新はApplicantUserNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.applicantUser.update).mockRejectedValue(notFoundPrismaError());

    await expect(
      updateApplicantUser("missing", { email: "a@example.com", displayName: "a" })
    ).rejects.toThrow(ApplicantUserNotFoundError);
  });

  it("更新時のDB接続エラー等はApplicantUserNotFoundErrorに変換せずそのまま送出する", async () => {
    vi.mocked(prisma.applicantUser.update).mockRejectedValue(new Error("connection lost"));

    await expect(
      updateApplicantUser("1", { email: "a@example.com", displayName: "a" })
    ).rejects.toThrow("connection lost");
  });
});

describe("setApplicantUserActive", () => {
  it("isActiveのみを更新する", async () => {
    vi.mocked(prisma.applicantUser.update).mockResolvedValue(
      baseApplicantUserRecord({ id: "1", isActive: false }) as never
    );

    const result = await setApplicantUserActive("1", false);

    expect(prisma.applicantUser.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { isActive: false },
    });
    expect(result.isActive).toBe(false);
  });

  it("存在しないIDの操作はApplicantUserNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.applicantUser.update).mockRejectedValue(notFoundPrismaError());

    await expect(setApplicantUserActive("missing", true)).rejects.toThrow(
      ApplicantUserNotFoundError
    );
  });
});

describe("isApplicantUserEmailTaken", () => {
  it("ApplicantUserテーブルに同じメールアドレスが存在するときtrueを返す", async () => {
    vi.mocked(prisma.applicantUser.findFirst).mockResolvedValue(
      baseApplicantUserRecord() as never
    );
    vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue(null);

    const result = await isApplicantUserEmailTaken("tanaka@example.com");

    expect(result).toBe(true);
  });

  it("HelpdeskStaffテーブルに同じメールアドレスが存在するときtrueを返す", async () => {
    vi.mocked(prisma.applicantUser.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue({
      id: "staff-1",
      email: "staff@helpdesk.example.com",
    } as never);

    const result = await isApplicantUserEmailTaken("staff@helpdesk.example.com");

    expect(result).toBe(true);
  });

  it("いずれのテーブルにも存在しないときfalseを返す", async () => {
    vi.mocked(prisma.applicantUser.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue(null);

    const result = await isApplicantUserEmailTaken("new@example.com");

    expect(result).toBe(false);
  });

  it("excludeId指定時はApplicantUser側で自分自身を除外して重複確認する", async () => {
    vi.mocked(prisma.applicantUser.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.helpdeskStaff.findFirst).mockResolvedValue(null);

    await isApplicantUserEmailTaken("tanaka@example.com", "applicant-1");

    expect(prisma.applicantUser.findFirst).toHaveBeenCalledWith({
      where: { email: "tanaka@example.com", id: { not: "applicant-1" } },
    });
  });
});
