import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/announcement-service", () => ({
  findAnnouncementVisibleToCountry: vi.fn(),
  getAnnouncementRecipientStatuses: vi.fn(),
  getAnnouncementSelfStatusForCompany: vi.fn(),
  getAnnouncementTrackingSummary: vi.fn(),
  isReminderPendingForCompany: vi.fn(),
  recordCompanyCompletion: vi.fn(),
  recordCompanyConfirmation: vi.fn(),
  sendAnnouncementReminders: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import {
  findAnnouncementVisibleToCountry as findAnnouncementVisibleToCountryService,
  getAnnouncementRecipientStatuses as getAnnouncementRecipientStatusesService,
  getAnnouncementSelfStatusForCompany as getAnnouncementSelfStatusForCompanyService,
  getAnnouncementTrackingSummary as getAnnouncementTrackingSummaryService,
  isReminderPendingForCompany as isReminderPendingForCompanyService,
  recordCompanyCompletion as recordCompanyCompletionService,
  recordCompanyConfirmation as recordCompanyConfirmationService,
  sendAnnouncementReminders as sendAnnouncementRemindersService,
} from "@/lib/server/announcement-service";
import {
  completeAnnouncementForCurrentCompany,
  confirmAnnouncementForCurrentCompany,
  getAnnouncementRecipientStatuses,
  getAnnouncementSelfStatus,
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

describe("confirmAnnouncementForCurrentCompany", () => {
  it("可視性チェックを通過した場合、セッションのcompanyCode/countryで記録する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findAnnouncementVisibleToCountryService).mockResolvedValue({
      id: "announcement-1",
      actionRequired: false,
    } as never);
    vi.mocked(recordCompanyConfirmationService).mockResolvedValue(undefined);
    vi.mocked(getAnnouncementSelfStatusForCompanyService).mockResolvedValue({
      confirmedAt: "2026-07-13T00:00:00.000Z",
      completedAt: null,
    });

    const result = await confirmAnnouncementForCurrentCompany("announcement-1");

    expect(findAnnouncementVisibleToCountryService).toHaveBeenCalledWith(
      "announcement-1",
      "VN"
    );
    expect(recordCompanyConfirmationService).toHaveBeenCalledWith(
      "announcement-1",
      "test-co"
    );
    expect(result.confirmedAt).toBe("2026-07-13T00:00:00.000Z");
  });

  it("下書き・配信対象外・公開期間外のときは記録せず正常終了する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findAnnouncementVisibleToCountryService).mockResolvedValue(null);
    vi.mocked(getAnnouncementSelfStatusForCompanyService).mockResolvedValue({
      confirmedAt: null,
      completedAt: null,
    });

    const result = await confirmAnnouncementForCurrentCompany("draft-announcement");

    expect(recordCompanyConfirmationService).not.toHaveBeenCalled();
    expect(result).toEqual({ confirmedAt: null, completedAt: null });
  });

  it("未認証（ヘルプデスクセッション）では例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    await expect(
      confirmAnnouncementForCurrentCompany("announcement-1")
    ).rejects.toThrow();
    expect(recordCompanyConfirmationService).not.toHaveBeenCalled();
  });
});

describe("completeAnnouncementForCurrentCompany", () => {
  it("可視性チェックを通過しactionRequiredが真のときのみ記録する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findAnnouncementVisibleToCountryService).mockResolvedValue({
      id: "announcement-1",
      actionRequired: true,
    } as never);
    vi.mocked(recordCompanyCompletionService).mockResolvedValue(undefined);
    vi.mocked(getAnnouncementSelfStatusForCompanyService).mockResolvedValue({
      confirmedAt: "2026-07-13T00:00:00.000Z",
      completedAt: "2026-07-13T00:00:00.000Z",
    });

    const result = await completeAnnouncementForCurrentCompany("announcement-1");

    expect(recordCompanyCompletionService).toHaveBeenCalledWith(
      "announcement-1",
      "test-co"
    );
    expect(result.completedAt).toBe("2026-07-13T00:00:00.000Z");
  });

  it("actionRequiredが偽のときは記録せず正常終了する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findAnnouncementVisibleToCountryService).mockResolvedValue({
      id: "announcement-1",
      actionRequired: false,
    } as never);
    vi.mocked(getAnnouncementSelfStatusForCompanyService).mockResolvedValue({
      confirmedAt: null,
      completedAt: null,
    });

    await completeAnnouncementForCurrentCompany("announcement-1");

    expect(recordCompanyCompletionService).not.toHaveBeenCalled();
  });

  it("下書き・配信対象外・公開期間外のときは記録せず正常終了する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findAnnouncementVisibleToCountryService).mockResolvedValue(null);
    vi.mocked(getAnnouncementSelfStatusForCompanyService).mockResolvedValue({
      confirmedAt: null,
      completedAt: null,
    });

    await completeAnnouncementForCurrentCompany("draft-announcement");

    expect(recordCompanyCompletionService).not.toHaveBeenCalled();
  });
});

describe("getAnnouncementSelfStatus", () => {
  it("セッションのcompanyCodeで自社の状態を取得する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(getAnnouncementSelfStatusForCompanyService).mockResolvedValue({
      confirmedAt: "2026-07-13T00:00:00.000Z",
      completedAt: null,
    });

    const result = await getAnnouncementSelfStatus("announcement-1");

    expect(getAnnouncementSelfStatusForCompanyService).toHaveBeenCalledWith(
      "announcement-1",
      "test-co"
    );
    expect(result.confirmedAt).toBe("2026-07-13T00:00:00.000Z");
  });

  it("未認証（ヘルプデスクセッション）では例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    await expect(getAnnouncementSelfStatus("announcement-1")).rejects.toThrow();
  });
});
