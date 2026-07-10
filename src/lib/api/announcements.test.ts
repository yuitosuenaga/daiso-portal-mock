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

  it("actionRequired・公開期間・対応期限を含む全フィールドを更新する", async () => {
    const created = await createAnnouncement({
      title: "更新確認用",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    await updateAnnouncement(created.id, {
      title: created.title,
      body: created.body,
      category: created.category,
      targeting: created.targeting,
      actionRequired: true,
      publishStartDate: "2026-08-01",
      publishEndDate: "2026-08-31",
      dueDate: "2026-08-15",
    });

    const updated = await getAnnouncementByIdForHelpdesk(created.id);
    expect(updated?.actionRequired).toBe(true);
    expect(updated?.publishStartDate).toBe("2026-08-01");
    expect(updated?.publishEndDate).toBe("2026-08-31");
    expect(updated?.dueDate).toBe("2026-08-15");
  });
});

describe("公開期間による表示制御", () => {
  function isoDateOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  it("公開期間が未設定の場合は常に表示される", async () => {
    const created = await createAnnouncement({
      title: "常時公開テスト",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
    });

    const result = await getAnnouncementById(created.id);
    expect(result?.id).toBe(created.id);
  });

  it("公開開始日が未来の場合、申請者側取得関数から除外されヘルプデスク向けには表示される", async () => {
    const created = await createAnnouncement({
      title: "開始前テスト",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
      publishStartDate: isoDateOffset(5),
    });

    expect(await getAnnouncementById(created.id)).toBeNull();
    const helpdeskResult = await getAnnouncementByIdForHelpdesk(created.id);
    expect(helpdeskResult?.id).toBe(created.id);
  });

  it("公開終了日が過去の場合、申請者側取得関数から除外される", async () => {
    const created = await createAnnouncement({
      title: "終了後テスト",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
      publishEndDate: isoDateOffset(-5),
    });

    expect(await getAnnouncementById(created.id)).toBeNull();
  });

  it("公開期間内の場合は表示される", async () => {
    const created = await createAnnouncement({
      title: "期間内テスト",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
      publishStartDate: isoDateOffset(-5),
      publishEndDate: isoDateOffset(5),
    });

    const result = await getAnnouncementById(created.id);
    expect(result?.id).toBe(created.id);
  });

  it("getAllAnnouncementsは公開期間に関わらず全件を返す", async () => {
    const created = await createAnnouncement({
      title: "全件確認用",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
      publishStartDate: isoDateOffset(5),
    });

    const all = await getAllAnnouncements();
    expect(all.some((item) => item.id === created.id)).toBe(true);
  });

  it("getRecentAnnouncementsは公開期間外のお知らせを除外する", async () => {
    const created = await createAnnouncement({
      title: "ウィジェット除外テスト",
      body: "本文",
      category: "other",
      targeting: { scope: "all" },
      actionRequired: false,
      publishStartDate: isoDateOffset(5),
    });

    const recent = await getRecentAnnouncements({ limit: 100 });
    expect(recent.some((item) => item.id === created.id)).toBe(false);
  });
});
