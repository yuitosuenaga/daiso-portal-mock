import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/get-session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/server/announcement-service", () => ({
  createAnnouncementRecord: vi.fn(),
  deleteAnnouncementRecord: vi.fn(),
  findAnnouncementById: vi.fn(),
  findAnnouncementVisibleToCountry: vi.fn(),
  listAllAnnouncements: vi.fn(),
  listAnnouncementsVisibleToCountry: vi.fn(),
  updateAnnouncementRecord: vi.fn(),
}));

import { getSession } from "@/lib/server/get-session";
import {
  createAnnouncementRecord,
  deleteAnnouncementRecord,
  findAnnouncementById as findAnnouncementByIdService,
  findAnnouncementVisibleToCountry,
  listAllAnnouncements as listAllAnnouncementsService,
  listAnnouncementsVisibleToCountry,
  updateAnnouncementRecord,
} from "@/lib/server/announcement-service";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  getAnnouncementByIdForHelpdesk,
  getAnnouncements,
  getRecentAnnouncements,
  updateAnnouncement,
} from "@/lib/api/announcements";
import type { Announcement, CreateAnnouncementInput } from "@/types/announcement";

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

const helpdeskSession = {
  claims: {
    id: "staff-1",
    role: "helpdesk" as const,
    staffId: "staff-1",
    displayName: "田中 太郎",
  },
};

function announcement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: "announcement-1",
    title: "タイトル",
    publishedAt: "2026-07-01T00:00:00.000Z",
    category: "other",
    body: "本文",
    targeting: { scope: "all" },
    actionRequired: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRecentAnnouncements", () => {
  it("自社country絞り込みの結果からデフォルトで最新3件を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(listAnnouncementsVisibleToCountry).mockResolvedValue([
      announcement({ id: "1" }),
      announcement({ id: "2" }),
      announcement({ id: "3" }),
      announcement({ id: "4" }),
    ]);

    const result = await getRecentAnnouncements();

    expect(listAnnouncementsVisibleToCountry).toHaveBeenCalledWith("VN");
    expect(result.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it("limit指定時にその件数を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(listAnnouncementsVisibleToCountry).mockResolvedValue([
      announcement({ id: "1" }),
      announcement({ id: "2" }),
    ]);

    const result = await getRecentAnnouncements({ limit: 1 });

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("未ログインのとき例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(getRecentAnnouncements()).rejects.toThrow();
  });
});

describe("getAnnouncements", () => {
  it("申請者セッションのcountryでlistAnnouncementsVisibleToCountryに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(listAnnouncementsVisibleToCountry).mockResolvedValue([announcement()]);

    const result = await getAnnouncements();

    expect(listAnnouncementsVisibleToCountry).toHaveBeenCalledWith("VN");
    expect(result).toHaveLength(1);
  });

  it("ヘルプデスクセッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);

    await expect(getAnnouncements()).rejects.toThrow();
  });
});

describe("getAnnouncementById", () => {
  it("申請者セッションのcountryでfindAnnouncementVisibleToCountryに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);
    vi.mocked(findAnnouncementVisibleToCountry).mockResolvedValue(announcement());

    const result = await getAnnouncementById("announcement-1");

    expect(findAnnouncementVisibleToCountry).toHaveBeenCalledWith(
      "announcement-1",
      "VN"
    );
    expect(result?.id).toBe("announcement-1");
  });

  it("未ログインのとき例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(getAnnouncementById("announcement-1")).rejects.toThrow();
  });
});

describe("getAllAnnouncements", () => {
  it("ヘルプデスクセッションでlistAllAnnouncementsに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(listAllAnnouncementsService).mockResolvedValue([announcement()]);

    const result = await getAllAnnouncements();

    expect(listAllAnnouncementsService).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(getAllAnnouncements()).rejects.toThrow();
  });
});

describe("getAnnouncementByIdForHelpdesk", () => {
  it("ヘルプデスクセッションでfindAnnouncementByIdに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(findAnnouncementByIdService).mockResolvedValue(announcement());

    const result = await getAnnouncementByIdForHelpdesk("announcement-1");

    expect(findAnnouncementByIdService).toHaveBeenCalledWith("announcement-1");
    expect(result?.id).toBe("announcement-1");
  });

  it("申請者セッションでは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(getAnnouncementByIdForHelpdesk("announcement-1")).rejects.toThrow();
  });
});

describe("createAnnouncement / updateAnnouncement / deleteAnnouncement", () => {
  const input: CreateAnnouncementInput = {
    title: "新規作成テスト",
    body: "本文",
    category: "other",
    targeting: { scope: "all" },
    actionRequired: false,
  };

  it("ヘルプデスクセッションでcreateAnnouncementRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(createAnnouncementRecord).mockResolvedValue(announcement());

    const result = await createAnnouncement(input);

    expect(createAnnouncementRecord).toHaveBeenCalledWith(input);
    expect(result.id).toBe("announcement-1");
  });

  it("申請者セッションでのcreateAnnouncementは例外を送出する", async () => {
    vi.mocked(getSession).mockResolvedValue(applicantSession as never);

    await expect(createAnnouncement(input)).rejects.toThrow();
  });

  it("ヘルプデスクセッションでupdateAnnouncementRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(updateAnnouncementRecord).mockResolvedValue(
      announcement({ title: "更新後" })
    );

    const result = await updateAnnouncement("announcement-1", input);

    expect(updateAnnouncementRecord).toHaveBeenCalledWith("announcement-1", input);
    expect(result.title).toBe("更新後");
  });

  it("ヘルプデスクセッションでdeleteAnnouncementRecordに委譲する", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    vi.mocked(deleteAnnouncementRecord).mockResolvedValue(undefined);

    await deleteAnnouncement("announcement-1");

    expect(deleteAnnouncementRecord).toHaveBeenCalledWith("announcement-1");
  });

  it("公開期間・対応期限を含む入力をそのままcreateAnnouncementRecordへ渡す", async () => {
    vi.mocked(getSession).mockResolvedValue(helpdeskSession as never);
    const inputWithNewFields: CreateAnnouncementInput = {
      ...input,
      actionRequired: true,
      publishStartDate: "2026-08-01",
      publishEndDate: "2026-08-31",
      dueDate: "2026-08-15",
    };
    vi.mocked(createAnnouncementRecord).mockResolvedValue(
      announcement(inputWithNewFields)
    );

    const result = await createAnnouncement(inputWithNewFields);

    expect(createAnnouncementRecord).toHaveBeenCalledWith(inputWithNewFields);
    expect(result.publishStartDate).toBe("2026-08-01");
    expect(result.publishEndDate).toBe("2026-08-31");
    expect(result.dueDate).toBe("2026-08-15");
  });
});
