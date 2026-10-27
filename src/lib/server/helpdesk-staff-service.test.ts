import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const {
  staffFindManyMock,
  staffFindUniqueMock,
  staffFindFirstMock,
  staffCountMock,
  staffCreateMock,
  staffUpdateMock,
  applicantFindFirstMock,
  executeRawMock,
  transactionMock,
  bcryptHashMock,
} = vi.hoisted(() => {
  const staffFindManyMock = vi.fn();
  const staffFindUniqueMock = vi.fn();
  const staffFindFirstMock = vi.fn();
  const staffCountMock = vi.fn();
  const staffCreateMock = vi.fn();
  const staffUpdateMock = vi.fn();
  const applicantFindFirstMock = vi.fn();
  const executeRawMock = vi.fn();
  const tx = {
    $executeRaw: executeRawMock,
    helpdeskStaff: {
      findUnique: staffFindUniqueMock,
      count: staffCountMock,
      update: staffUpdateMock,
    },
  };
  const transactionMock = vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx));
  return {
    staffFindManyMock,
    staffFindUniqueMock,
    staffFindFirstMock,
    staffCountMock,
    staffCreateMock,
    staffUpdateMock,
    applicantFindFirstMock,
    executeRawMock,
    transactionMock,
    bcryptHashMock: vi.fn(async (v: string) => `hashed:${v}`),
  };
});

vi.mock("bcryptjs", () => ({ default: { hash: bcryptHashMock } }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    helpdeskStaff: {
      findMany: staffFindManyMock,
      findFirst: staffFindFirstMock,
      create: staffCreateMock,
    },
    applicantUser: { findFirst: applicantFindFirstMock },
    $transaction: transactionMock,
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
  HelpdeskStaffNotFoundError,
  LastAdminError,
  StaffEmailTakenError,
  StaffSelfOperationError,
  createHelpdeskStaff,
  isStaffEmailTaken,
  listHelpdeskStaff,
  setHelpdeskStaffActive,
  setHelpdeskStaffRole,
} from "@/lib/server/helpdesk-staff-service";
import { ForbiddenSessionError } from "@/lib/server/auth-session";

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: "t1",
    email: "t@example.com",
    displayName: "対象",
    passwordHash: null,
    role: "member",
    registrationSource: "manual",
    isActive: true,
    createdAt: new Date("2026-07-01T00:00:00Z"),
    ...overrides,
  };
}

/** 操作者(op)の再読込と対象の読込を、idで出し分けて返す。 */
function setupLookups(
  operator: Record<string, unknown> | null,
  target: Record<string, unknown> | null
) {
  staffFindUniqueMock.mockImplementation(async ({ where }: { where: { id: string } }) =>
    where.id === "op" ? operator : target
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue({ claims: { id: "op", role: "helpdesk", staffId: "op" } });
  executeRawMock.mockResolvedValue(0);
  staffUpdateMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
    record(data)
  );
});

describe("全関数の admin ガード", () => {
  it("adminセッションが無ければ何も実行せず例外を伝播する", async () => {
    requireAdminMock.mockRejectedValue(new ForbiddenSessionError("x"));
    await expect(listHelpdeskStaff()).rejects.toThrow(ForbiddenSessionError);
    await expect(isStaffEmailTaken("a@example.com")).rejects.toThrow(ForbiddenSessionError);
    await expect(
      createHelpdeskStaff({ email: "a@example.com", displayName: "A", role: "member" })
    ).rejects.toThrow(ForbiddenSessionError);
    await expect(setHelpdeskStaffRole("t1", "admin")).rejects.toThrow(ForbiddenSessionError);
    await expect(setHelpdeskStaffActive("t1", false)).rejects.toThrow(ForbiddenSessionError);
    expect(transactionMock).not.toHaveBeenCalled();
    expect(staffFindManyMock).not.toHaveBeenCalled();
  });
});

describe("listHelpdeskStaff", () => {
  it("passwordHashを含まない形で、有効→作成日の順で取得する", async () => {
    staffFindManyMock.mockResolvedValue([record({ passwordHash: "secret" })]);
    const result = await listHelpdeskStaff();
    expect(result[0]).toEqual({
      id: "t1",
      email: "t@example.com",
      displayName: "対象",
      role: "member",
      registrationSource: "manual",
      isActive: true,
      createdAt: "2026-07-01T00:00:00.000Z",
    });
    expect(staffFindManyMock.mock.calls[0][0].orderBy).toEqual([
      { isActive: "desc" },
      { createdAt: "asc" },
    ]);
  });
});

describe("isStaffEmailTaken / createHelpdeskStaff", () => {
  it("HelpdeskStaff・ApplicantUserの両方を大文字小文字区別なしで検査する", async () => {
    staffFindFirstMock.mockResolvedValue(null);
    applicantFindFirstMock.mockResolvedValue(null);
    await expect(isStaffEmailTaken("A@Example.com")).resolves.toBe(false);
    const staffWhere = staffFindFirstMock.mock.calls[0][0].where;
    const applicantWhere = applicantFindFirstMock.mock.calls[0][0].where;
    expect(staffWhere.email).toEqual({ equals: "A@Example.com", mode: "insensitive" });
    expect(applicantWhere.email).toEqual({ equals: "A@Example.com", mode: "insensitive" });
  });

  it("どちらかに存在すれば重複(true)", async () => {
    staffFindFirstMock.mockResolvedValue(null);
    applicantFindFirstMock.mockResolvedValue({ id: "a" });
    await expect(isStaffEmailTaken("a@example.com")).resolves.toBe(true);
    staffFindFirstMock.mockResolvedValue({ id: "s" });
    applicantFindFirstMock.mockResolvedValue(null);
    await expect(isStaffEmailTaken("a@example.com")).resolves.toBe(true);
  });

  it("パスワード空欄ならpasswordHash=null・manual・指定ロールで作成する", async () => {
    staffCreateMock.mockResolvedValue(record({ role: "admin" }));
    await createHelpdeskStaff({
      email: "a@example.com",
      displayName: "A",
      password: "",
      role: "admin",
    });
    expect(bcryptHashMock).not.toHaveBeenCalled();
    expect(staffCreateMock.mock.calls[0][0].data).toMatchObject({
      email: "a@example.com",
      displayName: "A",
      passwordHash: null,
      registrationSource: "manual",
      role: "admin",
      isActive: true,
    });
  });

  it("パスワードありならbcryptでハッシュ化して保存する", async () => {
    staffCreateMock.mockResolvedValue(record());
    await createHelpdeskStaff({
      email: "a@example.com",
      displayName: "A",
      password: "password123",
      role: "member",
    });
    expect(bcryptHashMock).toHaveBeenCalledWith("password123", 10);
    expect(staffCreateMock.mock.calls[0][0].data.passwordHash).toBe("hashed:password123");
  });

  it("一意制約違反(P2002)はStaffEmailTakenErrorに変換する", async () => {
    staffCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "t" })
    );
    await expect(
      createHelpdeskStaff({ email: "a@example.com", displayName: "A", role: "member" })
    ).rejects.toThrow(StaffEmailTakenError);
  });
});

describe("setHelpdeskStaffRole / setHelpdeskStaffActive 共通", () => {
  it("トランザクション内で最初にadvisory lockを取得する", async () => {
    setupLookups(record({ id: "op", role: "admin" }), record());
    await setHelpdeskStaffRole("t1", "admin");
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(executeRawMock).toHaveBeenCalledTimes(1);
    expect(executeRawMock.mock.calls[0][0].join(" ")).toContain("pg_advisory_xact_lock");
    expect(executeRawMock.mock.invocationCallOrder[0]).toBeLessThan(
      staffFindUniqueMock.mock.invocationCallOrder[0]
    );
  });

  it.each([
    ["role", () => setHelpdeskStaffRole("t1", "admin")],
    ["active", () => setHelpdeskStaffActive("t1", false)],
  ])("操作者がトランザクション内で有効なadminでなければForbidden(%s)", async (_n, run) => {
    setupLookups(record({ id: "op", role: "member" }), record());
    await expect(run()).rejects.toThrow(ForbiddenSessionError);
    setupLookups(record({ id: "op", role: "admin", isActive: false }), record());
    await expect(run()).rejects.toThrow(ForbiddenSessionError);
    setupLookups(null, record());
    await expect(run()).rejects.toThrow(ForbiddenSessionError);
    expect(staffUpdateMock).not.toHaveBeenCalled();
  });

  it.each([
    ["role", () => setHelpdeskStaffRole("t1", "admin")],
    ["active", () => setHelpdeskStaffActive("t1", false)],
  ])("対象が存在しなければHelpdeskStaffNotFoundError(%s)", async (_n, run) => {
    setupLookups(record({ id: "op", role: "admin" }), null);
    await expect(run()).rejects.toThrow(HelpdeskStaffNotFoundError);
  });

  it.each([
    ["role", () => setHelpdeskStaffRole("op", "member")],
    ["active", () => setHelpdeskStaffActive("op", false)],
  ])("自分自身への操作はStaffSelfOperationError(%s)", async (_n, run) => {
    setupLookups(record({ id: "op", role: "admin" }), record({ id: "op", role: "admin" }));
    await expect(run()).rejects.toThrow(StaffSelfOperationError);
    expect(staffUpdateMock).not.toHaveBeenCalled();
  });
});

describe("setHelpdeskStaffRole", () => {
  it("他に有効adminがいなければ最後の有効adminの降格はLastAdminError", async () => {
    setupLookups(record({ id: "op", role: "admin" }), record({ role: "admin" }));
    staffCountMock.mockResolvedValue(0);
    await expect(setHelpdeskStaffRole("t1", "member")).rejects.toThrow(LastAdminError);
    expect(staffCountMock).toHaveBeenCalledWith({
      where: { role: "admin", isActive: true, id: { not: "t1" } },
    });
    expect(staffUpdateMock).not.toHaveBeenCalled();
  });

  it("操作者以外にも有効adminがいれば降格できる", async () => {
    setupLookups(record({ id: "op", role: "admin" }), record({ role: "admin" }));
    staffCountMock.mockResolvedValue(1);
    await setHelpdeskStaffRole("t1", "member");
    expect(staffUpdateMock).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { role: "member" },
    });
  });

  it("無効なadminの降格は最後のadmin制約を受けない", async () => {
    setupLookups(record({ id: "op", role: "admin" }), record({ role: "admin", isActive: false }));
    await setHelpdeskStaffRole("t1", "member");
    expect(staffCountMock).not.toHaveBeenCalled();
    expect(staffUpdateMock).toHaveBeenCalled();
  });

  it("member→admin昇格にはカウント検査をかけない", async () => {
    setupLookups(record({ id: "op", role: "admin" }), record({ role: "member" }));
    await setHelpdeskStaffRole("t1", "admin");
    expect(staffCountMock).not.toHaveBeenCalled();
    expect(staffUpdateMock).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { role: "admin" },
    });
  });
});

describe("setHelpdeskStaffActive", () => {
  it("最後の有効adminの無効化はLastAdminError", async () => {
    setupLookups(record({ id: "op", role: "admin" }), record({ role: "admin" }));
    staffCountMock.mockResolvedValue(0);
    await expect(setHelpdeskStaffActive("t1", false)).rejects.toThrow(LastAdminError);
    expect(staffUpdateMock).not.toHaveBeenCalled();
  });

  it("memberの無効化はカウント検査なしで許可される", async () => {
    setupLookups(record({ id: "op", role: "admin" }), record({ role: "member" }));
    await setHelpdeskStaffActive("t1", false);
    expect(staffCountMock).not.toHaveBeenCalled();
    expect(staffUpdateMock).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { isActive: false },
    });
  });

  it("再有効化は常に許可される", async () => {
    setupLookups(record({ id: "op", role: "admin" }), record({ role: "admin", isActive: false }));
    await setHelpdeskStaffActive("t1", true);
    expect(staffCountMock).not.toHaveBeenCalled();
    expect(staffUpdateMock).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { isActive: true },
    });
  });
});
