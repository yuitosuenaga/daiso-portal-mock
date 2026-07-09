import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/announcement-service", () => ({
  getAnnouncementRecipientStatuses: vi.fn(),
  getAnnouncementTrackingSummary: vi.fn(),
  isReminderPendingForCompany: vi.fn(),
  sendAnnouncementReminders: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import {
  getAnnouncementRecipientStatuses as getAnnouncementRecipientStatusesService,
  getAnnouncementTrackingSummary as getAnnouncementTrackingSummaryService,
  isReminderPendingForCompany as isReminderPendingForCompanyService,
  sendAnnouncementReminders as sendAnnouncementRemindersService,
} from "@/lib/server/announcement-service";
import {
  getAnnouncementRecipientStatuses,
  getAnnouncementTrackingSummary,
  isReminderPendingForCompany,
  sendAnnouncementReminders,
} from "@/lib/api/announcement-tracking";

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

describe("getAnnouncementRecipientStatuses", () => {
  it("ヘルプデスクセッションでサービス層に委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(getAnnouncementRecipientStatusesService).mockResolvedValue([]);

    const result = await getAnnouncementRecipientStatuses("announcement-1");

    expect(getAnnouncementRecipientStatusesService).toHaveBeenCalledWith(
      "announcement-1"
    );
    expect(result).toEqual([]);
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(
      getAnnouncementRecipientStatuses("announcement-1")
    ).rejects.toThrow();
  });
});

describe("getAnnouncementTrackingSummary", () => {
  it("ヘルプデスクセッションでサービス層に委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(getAnnouncementTrackingSummaryService).mockResolvedValue({
      totalRecipients: 16,
      confirmedCount: 10,
      completedCount: 6,
    });

    const result = await getAnnouncementTrackingSummary("announcement-1");

    expect(getAnnouncementTrackingSummaryService).toHaveBeenCalledWith(
      "announcement-1"
    );
    expect(result.totalRecipients).toBe(16);
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(
      getAnnouncementTrackingSummary("announcement-1")
    ).rejects.toThrow();
  });
});

describe("isReminderPendingForCompany", () => {
  it("セッション検証なしでサービス層に委譲する（申請者側から呼ばれるため）", async () => {
    vi.mocked(isReminderPendingForCompanyService).mockResolvedValue(true);

    const result = await isReminderPendingForCompany(
      "announcement-1",
      "vn-daiso-vietnam"
    );

    expect(isReminderPendingForCompanyService).toHaveBeenCalledWith(
      "announcement-1",
      "vn-daiso-vietnam"
    );
    expect(result).toBe(true);
  });
});

describe("sendAnnouncementReminders", () => {
  it("ヘルプデスクセッションでサービス層に委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(sendAnnouncementRemindersService).mockResolvedValue(undefined);

    await sendAnnouncementReminders("announcement-1", ["recipient-1"]);

    expect(sendAnnouncementRemindersService).toHaveBeenCalledWith(
      "announcement-1",
      ["recipient-1"]
    );
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(
      sendAnnouncementReminders("announcement-1", ["recipient-1"])
    ).rejects.toThrow();
  });
});
