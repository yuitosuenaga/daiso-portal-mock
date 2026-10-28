import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    applicantUser: { findUnique: vi.fn() },
    helpdeskStaff: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/server/announcement-service", () => ({
  findAnnouncementVisibleToCountry: vi.fn(),
  getAnnouncementSelfStatusForCompany: vi.fn(),
  getUserSelfConfirmation: vi.fn(),
  recordCompanyCompletion: vi.fn(),
  recordUserConfirmation: vi.fn(),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import {
  findAnnouncementVisibleToCountry,
  getAnnouncementSelfStatusForCompany,
  getUserSelfConfirmation,
  recordCompanyCompletion,
} from "@/lib/server/announcement-service";
import {
  completeAnnouncementForCurrentCompany,
  getAnnouncementSelfStatus,
  confirmAnnouncementForCurrentCompany,
} from "@/lib/api/announcement-tracking";

// getSession/requireApplicantSessionは本物を通し、JWTの会社情報が古くても
// DBの現在値が使われることを確認する（会社コード再割り当てによる他社状態の読み書きを防ぐ）。
describe("申請者セッションの会社情報のDB追従（announcement-tracking）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      claims: {
        id: "u1",
        role: "applicant",
        applicantUserId: "u1",
        companyId: "company-old",
        companyName: "Old",
        companyCode: "A",
        country: "JP",
      },
    } as never);
    vi.mocked(prisma.applicantUser.findUnique).mockResolvedValue({
      isActive: true,
      companyId: "company-new",
      company: { name: "New", companyCode: "B", country: "TH" },
    } as never);
    vi.mocked(findAnnouncementVisibleToCountry).mockResolvedValue({
      id: "ann-1",
      actionRequired: true,
    } as never);
    vi.mocked(getAnnouncementSelfStatusForCompany).mockResolvedValue({ completedAt: null } as never);
    vi.mocked(getUserSelfConfirmation).mockResolvedValue(null as never);
  });

  it("対応完了はJWTのAではなくDBのBの会社コードで記録される", async () => {
    await completeAnnouncementForCurrentCompany("ann-1");

    expect(recordCompanyCompletion).toHaveBeenCalledWith("ann-1", "B");
    expect(recordCompanyCompletion).not.toHaveBeenCalledWith("ann-1", "A");
  });

  it("自己状態の取得はDBの会社コードBで行われる", async () => {
    await getAnnouncementSelfStatus("ann-1");

    expect(getAnnouncementSelfStatusForCompany).toHaveBeenCalledWith("ann-1", "B");
    expect(getAnnouncementSelfStatusForCompany).not.toHaveBeenCalledWith("ann-1", "A");
  });

  it("配信対象の判定にはDBの現在のcountryが渡される", async () => {
    await confirmAnnouncementForCurrentCompany("ann-1");

    expect(findAnnouncementVisibleToCountry).toHaveBeenCalledWith(
      "ann-1",
      "TH",
      undefined,
      "u1",
      "company-new"
    );
  });
});
