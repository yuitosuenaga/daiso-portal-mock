import { describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    applicantUser: { findUnique: vi.fn() },
    helpdeskStaff: { findUnique: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  authorizeApplicantCredentials,
  authorizeHelpdeskCredentials,
} from "@/lib/server/authorize";

describe("authorizeApplicantCredentials", () => {
  it("正しいメールアドレス・パスワードのとき、申請者セッションクレームを返す", async () => {
    const passwordHash = await bcrypt.hash("password1234", 10);
    vi.mocked(prisma.applicantUser.findUnique).mockResolvedValue({
      id: "applicant-1",
      email: "applicant@example.com",
      passwordHash,
      displayName: "テスト太郎",
      companyId: "company-1",
      createdAt: new Date(),
      company: { id: "company-1", name: "Test Co.", country: "JP", companyCode: "jp-test", createdAt: new Date() },
    } as never);

    const result = await authorizeApplicantCredentials(
      "applicant@example.com",
      "password1234"
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
    vi.mocked(prisma.applicantUser.findUnique).mockResolvedValue({
      id: "applicant-1",
      email: "applicant@example.com",
      passwordHash,
      displayName: "テスト太郎",
      companyId: "company-1",
      createdAt: new Date(),
      company: { id: "company-1", name: "Test Co.", country: "JP", companyCode: "jp-test", createdAt: new Date() },
    } as never);

    const result = await authorizeApplicantCredentials(
      "applicant@example.com",
      "wrong-password"
    );

    expect(result).toBeNull();
  });

  it("該当ユーザーが存在しないとき、nullを返す", async () => {
    vi.mocked(prisma.applicantUser.findUnique).mockResolvedValue(null);

    const result = await authorizeApplicantCredentials(
      "unknown@example.com",
      "password1234"
    );

    expect(result).toBeNull();
  });
});

describe("authorizeHelpdeskCredentials", () => {
  it("正しいメールアドレス・パスワードのとき、ヘルプデスクセッションクレームを返す", async () => {
    const passwordHash = await bcrypt.hash("password1234", 10);
    vi.mocked(prisma.helpdeskStaff.findUnique).mockResolvedValue({
      id: "staff-1",
      email: "staff@example.com",
      passwordHash,
      displayName: "田中 太郎",
      createdAt: new Date(),
    } as never);

    const result = await authorizeHelpdeskCredentials(
      "staff@example.com",
      "password1234"
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
    vi.mocked(prisma.helpdeskStaff.findUnique).mockResolvedValue({
      id: "staff-1",
      email: "staff@example.com",
      passwordHash,
      displayName: "田中 太郎",
      createdAt: new Date(),
    } as never);

    const result = await authorizeHelpdeskCredentials(
      "staff@example.com",
      "wrong-password"
    );

    expect(result).toBeNull();
  });
});
