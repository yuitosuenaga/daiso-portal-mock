import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("@/lib/server/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
const { findApplicantIdsMock, findStaffIdsMock } = vi.hoisted(() => ({
  findApplicantIdsMock: vi.fn(),
  findStaffIdsMock: vi.fn(),
}));
vi.mock("@/lib/server/email-lookup", () => ({
  findApplicantUserIdsByEmail: findApplicantIdsMock,
  findHelpdeskStaffIdsByEmail: findStaffIdsMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    applicantUser: { findMany: vi.fn() },
    helpdeskStaff: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/server/logger";
import {
  authorizeApplicantCredentials,
  authorizeHelpdeskCredentials,
} from "@/lib/server/authorize";

// 照会ヘルパーは既定で1件ヒット扱い（行の中身は各テストのfindManyモックが決める）
beforeEach(() => {
  findApplicantIdsMock.mockReset().mockResolvedValue(["row-id"]);
  findStaffIdsMock.mockReset().mockResolvedValue(["row-id"]);
});

describe("authorizeApplicantCredentials", () => {
  it("正しいメールアドレス・パスワードのとき、申請者セッションクレームを返す", async () => {
    const passwordHash = await bcrypt.hash("password1234", 10);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      {
        id: "applicant-1",
        email: "applicant@example.com",
        passwordHash,
        displayName: "テスト太郎",
        companyId: "company-1",
        createdAt: new Date(),
        isActive: true,
        company: {
          id: "company-1",
          name: "Test Co.",
          country: "JP",
          companyCode: "jp-test",
          createdAt: new Date(),
        },
      },
    ] as never);

    const result = await authorizeApplicantCredentials(
      "applicant@example.com",
      "password1234",
    );

    expect(result).toEqual({
      id: "applicant-1",
      role: "applicant",
      applicantUserId: "applicant-1",
      companyId: "company-1",
      companyName: "Test Co.",
      companyCode: "jp-test",
      country: "JP",
    });
  });

  it("パスワードが誤っているとき、nullを返す", async () => {
    const passwordHash = await bcrypt.hash("password1234", 10);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      {
        id: "applicant-1",
        email: "applicant@example.com",
        passwordHash,
        displayName: "テスト太郎",
        companyId: "company-1",
        createdAt: new Date(),
        isActive: true,
        company: {
          id: "company-1",
          name: "Test Co.",
          country: "JP",
          companyCode: "jp-test",
          createdAt: new Date(),
        },
      },
    ] as never);

    const result = await authorizeApplicantCredentials(
      "applicant@example.com",
      "wrong-password",
    );

    expect(result).toBeNull();
  });

  it("該当ユーザーが存在しなくてもbcrypt照合を1回実行し、応答時間を揃える", async () => {
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([]);
    const spy = vi.spyOn(bcrypt, "compare");
    await authorizeApplicantCredentials("nobody@example.com", "x");
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("該当ユーザーが存在しないとき、nullを返す", async () => {
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([]);

    const result = await authorizeApplicantCredentials(
      "unknown@example.com",
      "password1234",
    );

    expect(result).toBeNull();
  });

  it("無効化(isActive: false)されたアカウントは、正しいパスワードでもnullを返す", async () => {
    const passwordHash = await bcrypt.hash("password1234", 10);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      {
        id: "applicant-1",
        email: "applicant@example.com",
        passwordHash,
        displayName: "テスト太郎",
        companyId: "company-1",
        createdAt: new Date(),
        isActive: false,
        company: {
          id: "company-1",
          name: "Test Co.",
          country: "JP",
          companyCode: "jp-test",
          createdAt: new Date(),
        },
      },
    ] as never);

    const result = await authorizeApplicantCredentials(
      "applicant@example.com",
      "password1234",
    );

    expect(result).toBeNull();
  });

  it("有効(isActive: true)なアカウントは、既存の挙動を維持する", async () => {
    const passwordHash = await bcrypt.hash("password1234", 10);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      {
        id: "applicant-1",
        email: "applicant@example.com",
        passwordHash,
        displayName: "テスト太郎",
        companyId: "company-1",
        createdAt: new Date(),
        isActive: true,
        company: {
          id: "company-1",
          name: "Test Co.",
          country: "JP",
          companyCode: "jp-test",
          createdAt: new Date(),
        },
      },
    ] as never);

    const result = await authorizeApplicantCredentials(
      "applicant@example.com",
      "password1234",
    );

    expect(result).not.toBeNull();
    expect(result?.applicantUserId).toBe("applicant-1");
  });
});

describe("authorizeHelpdeskCredentials", () => {
  it("passwordHashがnullの担当者はnullを返し、ダミーハッシュでbcrypt照合を1回実行する", async () => {
    vi.mocked(prisma.helpdeskStaff.findMany).mockResolvedValue([
      {
        id: "staff-2",
        email: "google@example.com",
        passwordHash: null,
        displayName: "Google 太郎",
        createdAt: new Date(),
        isActive: true,
      },
    ] as never);
    const spy = vi.spyOn(bcrypt, "compare");
    const result = await authorizeHelpdeskCredentials(
      "google@example.com",
      "x",
    );
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1]).not.toBeNull();
    spy.mockRestore();
  });

  it("正しいメールアドレス・パスワードのとき、ヘルプデスクセッションクレームを返す", async () => {
    const passwordHash = await bcrypt.hash("password1234", 10);
    vi.mocked(prisma.helpdeskStaff.findMany).mockResolvedValue([
      {
        id: "staff-1",
        email: "staff@example.com",
        passwordHash,
        displayName: "田中 太郎",
        createdAt: new Date(),
        isActive: true,
      },
    ] as never);

    const result = await authorizeHelpdeskCredentials(
      "staff@example.com",
      "password1234",
    );

    expect(result).toEqual({
      id: "staff-1",
      role: "helpdesk",
      staffId: "staff-1",
      displayName: "田中 太郎",
    });
  });

  it("パスワードが誤っているとき、nullを返す", async () => {
    const passwordHash = await bcrypt.hash("password1234", 10);
    vi.mocked(prisma.helpdeskStaff.findMany).mockResolvedValue([
      {
        id: "staff-1",
        email: "staff@example.com",
        passwordHash,
        displayName: "田中 太郎",
        createdAt: new Date(),
        isActive: true,
      },
    ] as never);

    const result = await authorizeHelpdeskCredentials(
      "staff@example.com",
      "wrong-password",
    );

    expect(result).toBeNull();
  });

  it("無効化された担当者は、パスワードが正しくてもnullを返す", async () => {
    const passwordHash = await bcrypt.hash("password1234", 10);
    vi.mocked(prisma.helpdeskStaff.findMany).mockResolvedValue([
      {
        id: "staff-1",
        email: "staff@example.com",
        passwordHash,
        displayName: "田中 太郎",
        createdAt: new Date(),
        isActive: false,
      },
    ] as never);

    const result = await authorizeHelpdeskCredentials(
      "staff@example.com",
      "password1234",
    );

    expect(result).toBeNull();
  });
});

function applicantRow(email: string, passwordHash: string, id = "applicant-1") {
  return {
    id,
    email,
    passwordHash,
    displayName: "テスト太郎",
    companyId: "company-1",
    createdAt: new Date(),
    isActive: true,
    company: {
      id: "company-1",
      name: "Test Co.",
      country: "JP",
      companyCode: "jp-test",
      createdAt: new Date(),
    },
  };
}

function staffRow(email: string, passwordHash: string | null, id = "staff-1") {
  return {
    id,
    email,
    passwordHash,
    displayName: "田中 太郎",
    createdAt: new Date(),
    isActive: true,
  };
}

describe("メールアドレスの大文字小文字の扱い（申請者）", () => {
  it("保存値がTanaka@x.comでも、入力tanaka@X.COMでログインできる", async () => {
    const passwordHash = await bcrypt.hash("password1234", 10);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      applicantRow("Tanaka@x.com", passwordHash),
    ] as never);

    const result = await authorizeApplicantCredentials(
      "tanaka@X.COM",
      "password1234",
    );

    expect(result?.applicantUserId).toBe("applicant-1");
  });

  it("ヘルパーが返したidだけをfindManyで読み、ILIKE（mode: insensitive）は使わない", async () => {
    findApplicantIdsMock.mockResolvedValue(["id-1", "id-2"]);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([]);

    await authorizeApplicantCredentials("  Tanaka@X.com ", "x");

    expect(findApplicantIdsMock).toHaveBeenCalledWith("  Tanaka@X.com ");
    const arg = vi.mocked(prisma.applicantUser.findMany).mock.calls.at(-1)?.[0];
    expect(arg?.where).toEqual({ id: { in: ["id-1", "id-2"] } });
  });

  it("ヘルパーが0件ならfindManyを呼ばずnull（ダミーbcryptは実行する）", async () => {
    findApplicantIdsMock.mockResolvedValue([]);
    vi.mocked(prisma.applicantUser.findMany).mockClear();
    const spy = vi.spyOn(bcrypt, "compare");

    expect(await authorizeApplicantCredentials("nobody@x.com", "x")).toBeNull();

    expect(prisma.applicantUser.findMany).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("重複があり入力と完全一致する行があれば、その行で照合する", async () => {
    const hashUpper = await bcrypt.hash("upper-pass-1", 10);
    const hashLower = await bcrypt.hash("lower-pass-1", 10);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      applicantRow("Tanaka@x.com", hashUpper, "upper"),
      applicantRow("tanaka@x.com", hashLower, "lower"),
    ] as never);

    const ok = await authorizeApplicantCredentials(
      "tanaka@x.com",
      "lower-pass-1",
    );
    expect(ok?.applicantUserId).toBe("lower");
    const other = await authorizeApplicantCredentials(
      "tanaka@x.com",
      "upper-pass-1",
    );
    expect(other).toBeNull();
  });

  it("重複があり完全一致も無いときは、パスワードが一致する行があってもnullを返す（ダミーbcryptを1回・警告ログにメールを出さない）", async () => {
    const hash = await bcrypt.hash("password1234", 10);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      applicantRow("Tanaka@x.com", hash, "a"),
      applicantRow("TANAKA@x.com", hash, "b"),
    ] as never);
    vi.mocked(logger.warn).mockClear();
    const spy = vi.spyOn(bcrypt, "compare");

    const result = await authorizeApplicantCredentials(
      "tanaka@x.com",
      "password1234",
    );

    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1]).not.toBe(hash);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain(
      "tanaka@x.com",
    );
    spy.mockRestore();
  });
});

describe("メールアドレスの大文字小文字の扱い（ヘルプデスク）", () => {
  it("保存値がStaff@x.comでも、入力staff@X.COMでログインできる", async () => {
    const passwordHash = await bcrypt.hash("password1234", 10);
    vi.mocked(prisma.helpdeskStaff.findMany).mockResolvedValue([
      staffRow("Staff@x.com", passwordHash),
    ] as never);

    const result = await authorizeHelpdeskCredentials(
      "staff@X.COM",
      "password1234",
    );

    expect(result?.staffId).toBe("staff-1");
  });

  it("ヘルパーが返したidだけをfindManyで読み、ILIKE（mode: insensitive）は使わない", async () => {
    findStaffIdsMock.mockResolvedValue(["id-1"]);
    vi.mocked(prisma.helpdeskStaff.findMany).mockResolvedValue([]);

    await authorizeHelpdeskCredentials(" Staff@X.com", "x");

    expect(findStaffIdsMock).toHaveBeenCalledWith(" Staff@X.com");
    const arg = vi.mocked(prisma.helpdeskStaff.findMany).mock.calls.at(-1)?.[0];
    expect(arg?.where).toEqual({ id: { in: ["id-1"] } });
  });

  it("重複があり入力と完全一致する行があれば、その行で照合する", async () => {
    const hashUpper = await bcrypt.hash("upper-pass-1", 10);
    const hashLower = await bcrypt.hash("lower-pass-1", 10);
    vi.mocked(prisma.helpdeskStaff.findMany).mockResolvedValue([
      staffRow("Staff@x.com", hashUpper, "upper"),
      staffRow("staff@x.com", hashLower, "lower"),
    ] as never);

    const ok = await authorizeHelpdeskCredentials(
      "staff@x.com",
      "lower-pass-1",
    );
    expect(ok?.staffId).toBe("lower");
  });

  it("重複があり完全一致も無いときはnullを返し、ダミーbcryptを1回だけ実行する", async () => {
    const hash = await bcrypt.hash("password1234", 10);
    vi.mocked(prisma.helpdeskStaff.findMany).mockResolvedValue([
      staffRow("Staff@x.com", hash, "a"),
      staffRow("STAFF@x.com", hash, "b"),
    ] as never);
    const spy = vi.spyOn(bcrypt, "compare");

    const result = await authorizeHelpdeskCredentials(
      "staff@x.com",
      "password1234",
    );

    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1]).not.toBe(hash);
    spy.mockRestore();
  });
});
