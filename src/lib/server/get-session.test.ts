import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    applicantUser: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/server/get-session";

describe("getSession", () => {
  it("セッションが存在しないとき、nullを返しDB照会を行わない", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await getSession();

    expect(result).toBeNull();
    expect(prisma.applicantUser.findUnique).not.toHaveBeenCalled();
  });

  it("ヘルプデスクセッションのとき、isActiveの再照会を行わずそのまま返す", async () => {
    const session = {
      claims: { id: "staff-1", role: "helpdesk", staffId: "staff-1", displayName: "田中" },
    };
    vi.mocked(auth).mockResolvedValue(session as never);

    const result = await getSession();

    expect(result).toEqual(session);
    expect(prisma.applicantUser.findUnique).not.toHaveBeenCalled();
  });

  it("申請者セッションでApplicantUserが有効なとき、セッションをそのまま返す", async () => {
    const session = {
      claims: {
        id: "applicant-1",
        role: "applicant",
        applicantUserId: "applicant-1",
        companyId: "company-1",
        companyName: "Test Co.",
        companyCode: "test-co",
        country: "JP",
      },
    };
    vi.mocked(auth).mockResolvedValue(session as never);
    vi.mocked(prisma.applicantUser.findUnique).mockResolvedValue({
      isActive: true,
    } as never);

    const result = await getSession();

    expect(result).toEqual(session);
    expect(prisma.applicantUser.findUnique).toHaveBeenCalledWith({
      where: { id: "applicant-1" },
      select: { isActive: true },
    });
  });

  it("申請者セッションでApplicantUserが無効化されているとき、claimsをnullにする", async () => {
    const session = {
      claims: {
        id: "applicant-1",
        role: "applicant",
        applicantUserId: "applicant-1",
        companyId: "company-1",
        companyName: "Test Co.",
        companyCode: "test-co",
        country: "JP",
      },
    };
    vi.mocked(auth).mockResolvedValue(session as never);
    vi.mocked(prisma.applicantUser.findUnique).mockResolvedValue({
      isActive: false,
    } as never);

    const result = await getSession();

    expect(result).toEqual({ ...session, claims: null });
  });

  it("申請者セッションだがApplicantUserが既に存在しないとき、claimsをnullにする", async () => {
    const session = {
      claims: {
        id: "applicant-1",
        role: "applicant",
        applicantUserId: "applicant-1",
        companyId: "company-1",
        companyName: "Test Co.",
        companyCode: "test-co",
        country: "JP",
      },
    };
    vi.mocked(auth).mockResolvedValue(session as never);
    vi.mocked(prisma.applicantUser.findUnique).mockResolvedValue(null);

    const result = await getSession();

    expect(result).toEqual({ ...session, claims: null });
  });
});
