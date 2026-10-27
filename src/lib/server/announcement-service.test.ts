import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    announcement: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    announcementRecipient: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
    announcementRecipientStatus: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    applicantUser: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
    },
    company: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    announcementReadReceipt: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
    },
    document: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  },
}));

vi.mock("@/lib/server/announcement-notifications", () => ({
  notifyAnnouncementPublished: vi.fn().mockResolvedValue(undefined),
  notifyAnnouncementReminder: vi.fn().mockResolvedValue(undefined),
  notifyAnnouncementTargetExpanded: vi.fn().mockResolvedValue(undefined),
  notifyAnnouncementUserReadReminder: vi.fn().mockResolvedValue(undefined),
}));

import type { AnnouncementTargeting } from "@/types/announcement";
import { prisma } from "@/lib/db/prisma";
import {
  notifyAnnouncementPublished,
  notifyAnnouncementReminder,
  notifyAnnouncementTargetExpanded,
  notifyAnnouncementUserReadReminder,
} from "@/lib/server/announcement-notifications";
import {
  AnnouncementNotFoundError,
  AnnouncementTargetUsersNotFoundError,
  createAnnouncementRecord,
  deleteAnnouncementRecord,
  findAnnouncementById,
  findAnnouncementVisibleToCountry,
  getAnnouncementRecipientStatuses,
  getAnnouncementSelfStatusForCompany,
  getAnnouncementSelfStatuses,
  getAnnouncementTrackingStatusesBulk,
  getAnnouncementTrackingSummary,
  getAnnouncementUserReadStatuses,
  getUserSelfConfirmation,
  isReminderPendingForCompany,
  listAllAnnouncements,
  listAnnouncementsVisibleToCountry,
  recordCompanyCompletion,
  recordUserConfirmation,
  resolveAnnouncementContent,
  sendAnnouncementReminders,
  sendUserReadReminders,
  targetApplicantUsersWhere,
  updateAnnouncementRecord,
} from "@/lib/server/announcement-service";

function baseAnnouncementRecord(
  overrides: Partial<{
    id: string;
    title: string;
    body: string;
    category: "maintenance" | "policy" | "incident" | "other";
    status: "draft" | "published";
    publishedAt: Date | null;
    actionRequired: boolean;
    sendEmailNotification: boolean;
    targetingScope: "all" | "countries" | "users";
    targetingCountries: string[];
    targetingUserIds: string[];
    targetingCompanyIds: string[];
    publishStartDate: Date | null;
    publishEndDate: Date | null;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    attachments: {
      id: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      dataUrl: string;
      announcementId: string;
    }[];
    linkedDocuments: { id: string; announcementId: string; documentId: string }[];
    translations: { id: string; announcementId: string; locale: string; title: string; body: string }[];
  }> = {}
) {
  return {
    id: "announcement-1",
    title: "タイトル",
    body: "本文",
    category: "other" as const,
    status: "published" as const,
    publishedAt: new Date("2026-07-01T09:00:00.000Z"),
    actionRequired: false,
    sendEmailNotification: false,
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    targetingUserIds: [] as string[],
    targetingCompanyIds: [] as string[],
    publishStartDate: null,
    publishEndDate: null,
    dueDate: null,
    createdAt: new Date("2026-07-01T09:00:00.000Z"),
    updatedAt: new Date("2026-07-01T09:00:00.000Z"),
    attachments: [] as {
      id: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      dataUrl: string;
      announcementId: string;
    }[],
    linkedDocuments: [] as { id: string; announcementId: string; documentId: string }[],
    translations: [] as {
      id: string;
      announcementId: string;
      locale: string;
      title: string;
      body: string;
    }[],
    ...overrides,
  };
}

function isoDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function recipientRecord(
  id: string,
  companyCode: string,
  country: string,
  statuses: {
    completedAt: Date | null;
    reminderSentAt: Date | null;
  }[] = []
) {
  return {
    id,
    companyId: `company-${companyCode}`,
    contactName: `担当者-${id}`,
    company: {
      id: `company-${companyCode}`,
      companyCode,
      name: `Company ${companyCode}`,
      country,
    },
    statuses,
  };
}

function applicantUserRecord(
  id: string,
  companyCode: string,
  country: string,
  readReceipts: {
    confirmedAt: Date | null;
    readReminderSentAt: Date | null;
  }[] = []
) {
  return {
    id,
    email: `${id}@example.com`,
    displayName: `担当者-${id}`,
    companyId: `company-${companyCode}`,
    isActive: true,
    preferredLocale: "en",
    company: {
      id: `company-${companyCode}`,
      companyCode,
      name: `Company ${companyCode}`,
      country,
    },
    announcementReadReceipts: readReceipts,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listAnnouncementsVisibleToCountry: 言語別コンテンツの解決（要件16.2, 16.3）", () => {
  it("localeにenを指定し、対応する翻訳が存在する場合はen翻訳のタイトル・本文を返す", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      baseAnnouncementRecord({
        id: "1",
        title: "日本語タイトル",
        body: "日本語本文",
        translations: [
          { id: "t1", announcementId: "1", locale: "en", title: "English Title", body: "English Body" },
        ],
      }),
    ] as never);

    const result = await listAnnouncementsVisibleToCountry("VN", "en");

    expect(result[0].title).toBe("English Title");
    expect(result[0].body).toBe("English Body");
  });

  it("localeにenを指定しても対応する翻訳が存在しない場合は既定言語（ja）にフォールバックする", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      baseAnnouncementRecord({ id: "1", title: "日本語タイトル", body: "日本語本文" }),
    ] as never);

    const result = await listAnnouncementsVisibleToCountry("VN", "en");

    expect(result[0].title).toBe("日本語タイトル");
    expect(result[0].body).toBe("日本語本文");
  });

  it("localeを指定しない場合は既定言語（ja）のタイトル・本文を返す", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      baseAnnouncementRecord({
        id: "1",
        title: "日本語タイトル",
        body: "日本語本文",
        translations: [
          { id: "t1", announcementId: "1", locale: "en", title: "English Title", body: "English Body" },
        ],
      }),
    ] as never);

    const result = await listAnnouncementsVisibleToCountry("VN");

    expect(result[0].title).toBe("日本語タイトル");
    expect(result[0].body).toBe("日本語本文");
  });
});

describe("listAnnouncementsVisibleToCountry: 個人・会社指定の閲覧可否", () => {
  it("閲覧者の個人IDと所属会社IDが分かる場合、個人指定・会社指定の両方を閲覧対象に含める", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([] as never);

    await listAnnouncementsVisibleToCountry("VN", "ja", "user-1", "company-1");

    expect(prisma.announcement.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          status: "published",
          OR: [
            { targetingScope: "all" },
            { targetingScope: "countries", targetingCountries: { has: "VN" } },
            { targetingScope: "users", targetingUserIds: { has: "user-1" } },
            { targetingScope: "users", targetingCompanyIds: { has: "company-1" } },
          ],
        },
      })
    );
  });

  it("個人IDも会社IDも不明なら、個人・会社指定のお知らせは対象に含めない", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([] as never);

    await listAnnouncementsVisibleToCountry("VN");

    expect(prisma.announcement.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          status: "published",
          OR: [
            { targetingScope: "all" },
            { targetingScope: "countries", targetingCountries: { has: "VN" } },
          ],
        },
      })
    );
  });
});

describe("listAnnouncementsVisibleToCountry", () => {
  it("公開日降順で取得し、Announcement型に整形する", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      baseAnnouncementRecord({ id: "1" }),
    ] as never);

    const result = await listAnnouncementsVisibleToCountry("VN");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "published",
          OR: [
            { targetingScope: "all" },
            { targetingScope: "countries", targetingCountries: { has: "VN" } },
          ],
        },
      })
    );
  });

  it("公開期間が未設定の場合は常に含まれる", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      baseAnnouncementRecord({ id: "1" }),
    ] as never);

    const result = await listAnnouncementsVisibleToCountry("VN");

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("公開開始日が未来の場合は除外される", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      baseAnnouncementRecord({
        id: "1",
        publishStartDate: new Date(`${isoDateOffset(5)}T00:00:00.000Z`),
      }),
    ] as never);

    const result = await listAnnouncementsVisibleToCountry("VN");

    expect(result).toHaveLength(0);
  });

  it("公開終了日が過去の場合は除外される", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      baseAnnouncementRecord({
        id: "1",
        publishEndDate: new Date(`${isoDateOffset(-5)}T00:00:00.000Z`),
      }),
    ] as never);

    const result = await listAnnouncementsVisibleToCountry("VN");

    expect(result).toHaveLength(0);
  });

  it("公開期間内の場合は含まれる", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      baseAnnouncementRecord({
        id: "1",
        publishStartDate: new Date(`${isoDateOffset(-5)}T00:00:00.000Z`),
        publishEndDate: new Date(`${isoDateOffset(5)}T00:00:00.000Z`),
      }),
    ] as never);

    const result = await listAnnouncementsVisibleToCountry("VN");

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });
});

describe("findAnnouncementVisibleToCountry", () => {
  it("配信対象に含まれるお知らせを返す", async () => {
    vi.mocked(prisma.announcement.findFirst).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        targetingScope: "countries",
        targetingCountries: ["VN", "TH"],
      }) as never
    );

    const result = await findAnnouncementVisibleToCountry("1", "VN");

    expect(result?.targeting).toEqual({ scope: "countries", countries: ["VN", "TH"] });
  });

  it("存在しない場合はnullを返す", async () => {
    vi.mocked(prisma.announcement.findFirst).mockResolvedValue(null);

    const result = await findAnnouncementVisibleToCountry("missing", "VN");

    expect(result).toBeNull();
  });

  it("localeにenを指定し、対応する翻訳が存在する場合はen翻訳のタイトル・本文を返す（要件16.2）", async () => {
    vi.mocked(prisma.announcement.findFirst).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        title: "日本語タイトル",
        body: "日本語本文",
        translations: [
          { id: "t1", announcementId: "1", locale: "en", title: "English Title", body: "English Body" },
        ],
      }) as never
    );

    const result = await findAnnouncementVisibleToCountry("1", "VN", "en");

    expect(result?.title).toBe("English Title");
    expect(result?.body).toBe("English Body");
  });

  it("localeにenを指定しても対応する翻訳が存在しない場合は既定言語（ja）にフォールバックする（要件16.3）", async () => {
    vi.mocked(prisma.announcement.findFirst).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", title: "日本語タイトル", body: "日本語本文" }) as never
    );

    const result = await findAnnouncementVisibleToCountry("1", "VN", "en");

    expect(result?.title).toBe("日本語タイトル");
    expect(result?.body).toBe("日本語本文");
  });

  it("公開開始日が未来の場合はnullを返す", async () => {
    vi.mocked(prisma.announcement.findFirst).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        publishStartDate: new Date(`${isoDateOffset(5)}T00:00:00.000Z`),
      }) as never
    );

    const result = await findAnnouncementVisibleToCountry("1", "VN");

    expect(result).toBeNull();
  });
});

describe("listAllAnnouncements / findAnnouncementById", () => {
  it("絞り込みなしで全件を作成日時の降順で取得する", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      baseAnnouncementRecord({ id: "1" }),
      baseAnnouncementRecord({ id: "2" }),
    ] as never);

    const result = await listAllAnnouncements();

    expect(result.map((item) => item.id)).toEqual(["1", "2"]);
    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } })
    );
  });

  it("下書き・公開済みが混在していても公開状態に関わらず全件を返す", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      baseAnnouncementRecord({ id: "1", status: "draft", publishedAt: null }),
      baseAnnouncementRecord({ id: "2", status: "published" }),
    ] as never);

    const result = await listAllAnnouncements();

    expect(result.map((item) => item.status)).toEqual(["draft", "published"]);
  });

  it("公開期間に関わらず全件を返す", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      baseAnnouncementRecord({
        id: "1",
        publishStartDate: new Date(`${isoDateOffset(5)}T00:00:00.000Z`),
      }),
    ] as never);

    const result = await listAllAnnouncements();

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("存在しないIDはnullを返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(null);

    const result = await findAnnouncementById("missing");

    expect(result).toBeNull();
  });

  it("公開開始日が未来でも取得できる", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        publishStartDate: new Date(`${isoDateOffset(5)}T00:00:00.000Z`),
      }) as never
    );

    const result = await findAnnouncementById("1");

    expect(result?.id).toBe("1");
  });
});

describe("個人・会社指定のtargeting正規化", () => {
  const usersInput = (userIds: string[], companyIds: string[] = []) => ({
    title: "タイトル",
    body: "本文",
    category: "other" as const,
    status: "draft" as const,
    targeting: { scope: "users" as const, userIds, companyIds },
    actionRequired: false,
    sendEmailNotification: false,
    attachments: [],
    linkedDocumentIds: [],
    translations: [],
  });

  it("重複と実在しないIDを除いて保存する", async () => {
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValueOnce([{ id: "u1" }] as never);
    vi.mocked(prisma.announcement.create).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", targetingScope: "users", targetingUserIds: ["u1"] }) as never
    );

    await createAnnouncementRecord(usersInput(["u1", "u1", "ghost"]));

    expect(prisma.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetingScope: "users",
          targetingCountries: [],
          targetingUserIds: ["u1"],
          targetingCompanyIds: [],
        }),
      })
    );
  });

  it("会社のみの指定は実在する会社だけを重複なしで保存する", async () => {
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.company.findMany).mockResolvedValueOnce([{ id: "c1" }] as never);
    vi.mocked(prisma.announcement.create).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        targetingScope: "users",
        targetingCompanyIds: ["c1"],
      }) as never
    );

    await createAnnouncementRecord(usersInput([], ["c1", "c1", "ghost-company"]));

    expect(prisma.company.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: { in: ["c1", "ghost-company"] } } })
    );
    expect(prisma.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetingScope: "users",
          targetingUserIds: [],
          targetingCompanyIds: ["c1"],
        }),
      })
    );
  });

  it("個人と会社を併用して保存できる", async () => {
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValueOnce([{ id: "u1" }] as never);
    vi.mocked(prisma.company.findMany).mockResolvedValueOnce([{ id: "c1" }] as never);
    vi.mocked(prisma.announcement.create).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", targetingScope: "users" }) as never
    );

    await createAnnouncementRecord(usersInput(["u1"], ["c1"]));

    expect(prisma.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetingUserIds: ["u1"],
          targetingCompanyIds: ["c1"],
        }),
      })
    );
  });

  it("無効化済みアカウントは対象から除外する（有効なアカウントだけを検索する）", async () => {
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValueOnce([{ id: "u1" }] as never);
    vi.mocked(prisma.announcement.create).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", targetingScope: "users", targetingUserIds: ["u1"] }) as never
    );

    await createAnnouncementRecord(usersInput(["u1", "inactive"]));

    expect(prisma.applicantUser.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: { in: ["u1", "inactive"] }, isActive: true },
      })
    );
  });

  it("実在する個人も会社も1件も無い場合は保存せずエラーにする", async () => {
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.company.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.announcement.create).mockClear();

    await expect(
      createAnnouncementRecord(usersInput(["ghost"], ["ghost-company"]))
    ).rejects.toBeInstanceOf(
      AnnouncementTargetUsersNotFoundError
    );
    expect(prisma.announcement.create).not.toHaveBeenCalled();
  });
});

describe("createAnnouncementRecord / updateAnnouncementRecord / deleteAnnouncementRecord", () => {
  it("targetingを列に変換して作成する", async () => {
    vi.mocked(prisma.announcement.create).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        targetingScope: "countries",
        targetingCountries: ["JP"],
      }) as never
    );

    const result = await createAnnouncementRecord({
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "countries", countries: ["JP"] },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(prisma.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetingScope: "countries",
          targetingCountries: ["JP"],
        }),
      })
    );
    expect(result.targeting).toEqual({ scope: "countries", countries: ["JP"] });
  });

  it("公開期間・対応期限を列に変換して作成する", async () => {
    vi.mocked(prisma.announcement.create).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        actionRequired: true,
        sendEmailNotification: false,
        publishStartDate: new Date("2026-08-01T00:00:00.000Z"),
        publishEndDate: new Date("2026-08-31T00:00:00.000Z"),
        dueDate: new Date("2026-08-15T00:00:00.000Z"),
      }) as never
    );

    const result = await createAnnouncementRecord({
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: true,
      sendEmailNotification: false,
      publishStartDate: "2026-08-01",
      publishEndDate: "2026-08-31",
      dueDate: "2026-08-15",
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(prisma.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          publishStartDate: new Date("2026-08-01"),
          publishEndDate: new Date("2026-08-31"),
          dueDate: new Date("2026-08-15"),
        }),
      })
    );
    expect(result.publishStartDate).toBe("2026-08-01");
    expect(result.publishEndDate).toBe("2026-08-31");
    expect(result.dueDate).toBe("2026-08-15");
  });

  it("公開期間・対応期限を未指定で作成した場合はnullを列に渡す", async () => {
    vi.mocked(prisma.announcement.create).mockResolvedValue(
      baseAnnouncementRecord({ id: "1" }) as never
    );

    await createAnnouncementRecord({
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(prisma.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          publishStartDate: null,
          publishEndDate: null,
          dueDate: null,
        }),
      })
    );
  });

  it("存在しないIDの更新はAnnouncementNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.announcement.update).mockRejectedValue(new Error("not found"));

    await expect(
      updateAnnouncementRecord("missing", {
        title: "t",
        body: "b",
        category: "other",
        status: "published",
        targeting: { scope: "all" },
        actionRequired: false,
        sendEmailNotification: false,
        attachments: [],
        linkedDocumentIds: [],
        translations: [],
      })
    ).rejects.toThrow(AnnouncementNotFoundError);
  });

  it("下書き→公開への更新では公開日時を現在時刻で打刻する", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "draft", publishedAt: null }) as never
    );
    vi.mocked(prisma.announcement.update).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "published" }) as never
    );

    await updateAnnouncementRecord("1", {
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(prisma.announcement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ publishedAt: expect.any(Date) }),
      })
    );
  });

  it("公開済みのまま更新した場合は公開日時を変更しない", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "published" }) as never
    );
    vi.mocked(prisma.announcement.update).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "published" }) as never
    );

    await updateAnnouncementRecord("1", {
      title: "タイトル（更新）",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(prisma.announcement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ publishedAt: expect.anything() }),
      })
    );
  });

  it("公開済みから下書きへ差し戻した場合は公開日時を変更しない", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "published" }) as never
    );
    vi.mocked(prisma.announcement.update).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "draft" }) as never
    );

    await updateAnnouncementRecord("1", {
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "draft",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(prisma.announcement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ publishedAt: expect.anything() }),
      })
    );
  });

  it("配信対象国を拡大（VN→VN,TH）して公開のまま更新すると、新規追加分（TH）のwhereで追加通知が1回呼ばれ、公開通知は呼ばれない（要件35.1, 35.2）", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        status: "published",
        targetingScope: "countries",
        targetingCountries: ["VN"],
      }) as never
    );
    vi.mocked(prisma.announcement.update).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        status: "published",
        targetingScope: "countries",
        targetingCountries: ["VN", "TH"],
      }) as never
    );

    await updateAnnouncementRecord("1", {
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "countries", countries: ["VN", "TH"] },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(notifyAnnouncementTargetExpanded).toHaveBeenCalledTimes(1);
    expect(notifyAnnouncementTargetExpanded).toHaveBeenCalledWith("1", {
      isActive: true,
      company: { country: { in: ["TH"] } },
    });
    expect(notifyAnnouncementPublished).not.toHaveBeenCalled();
  });

  it("配信対象国が縮小（all→countries）または同一（countries→同一）のときは追加通知を呼ばない（要件35.3, 35.5）", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "published", targetingScope: "all" }) as never
    );
    vi.mocked(prisma.announcement.update).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        status: "published",
        targetingScope: "countries",
        targetingCountries: ["VN"],
      }) as never
    );

    await updateAnnouncementRecord("1", {
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "countries", countries: ["VN"] },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(notifyAnnouncementTargetExpanded).not.toHaveBeenCalled();

    vi.clearAllMocks();
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        status: "published",
        targetingScope: "countries",
        targetingCountries: ["VN"],
      }) as never
    );
    vi.mocked(prisma.announcement.update).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        status: "published",
        targetingScope: "countries",
        targetingCountries: ["VN"],
      }) as never
    );

    await updateAnnouncementRecord("1", {
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "countries", countries: ["VN"] },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(notifyAnnouncementTargetExpanded).not.toHaveBeenCalled();
  });

  it("配信対象がcountries=[VN]からallへ変更されたとき、notIn:[VN]のwhereで追加通知が呼ばれる（要件35.4）", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        status: "published",
        targetingScope: "countries",
        targetingCountries: ["VN"],
      }) as never
    );
    vi.mocked(prisma.announcement.update).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "published", targetingScope: "all" }) as never
    );

    await updateAnnouncementRecord("1", {
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(notifyAnnouncementTargetExpanded).toHaveBeenCalledWith("1", {
      isActive: true,
      company: { country: { notIn: ["VN"] } },
    });
  });

  it("下書き→公開への更新ではnotifyAnnouncementPublishedのみが呼ばれ、追加通知は呼ばれない（要件35.6、二重送信防止）", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        status: "draft",
        publishedAt: null,
        targetingScope: "countries",
        targetingCountries: ["VN"],
      }) as never
    );
    vi.mocked(prisma.announcement.update).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        status: "published",
        targetingScope: "countries",
        targetingCountries: ["VN", "TH"],
      }) as never
    );

    await updateAnnouncementRecord("1", {
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "countries", countries: ["VN", "TH"] },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(notifyAnnouncementPublished).toHaveBeenCalledTimes(1);
    expect(notifyAnnouncementTargetExpanded).not.toHaveBeenCalled();
  });

  it("更新後が下書き（draft）のときはいずれの通知も呼ばれない（要件35.7）", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        status: "published",
        targetingScope: "countries",
        targetingCountries: ["VN"],
      }) as never
    );
    vi.mocked(prisma.announcement.update).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        status: "draft",
        targetingScope: "countries",
        targetingCountries: ["VN", "TH"],
      }) as never
    );

    await updateAnnouncementRecord("1", {
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "draft",
      targeting: { scope: "countries", countries: ["VN", "TH"] },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(notifyAnnouncementPublished).not.toHaveBeenCalled();
    expect(notifyAnnouncementTargetExpanded).not.toHaveBeenCalled();
  });

  it("追加通知の経路ではannouncementRecipient.createが呼ばれない（台帳を新規作成しない。要件35.10）", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        status: "published",
        targetingScope: "countries",
        targetingCountries: ["VN"],
      }) as never
    );
    vi.mocked(prisma.announcement.update).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        status: "published",
        targetingScope: "countries",
        targetingCountries: ["VN", "TH"],
      }) as never
    );

    await updateAnnouncementRecord("1", {
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "countries", countries: ["VN", "TH"] },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(prisma.announcementRecipient.create).not.toHaveBeenCalled();
  });

  it("下書きとして新規作成した場合は公開日時をnullで保存する", async () => {
    vi.mocked(prisma.announcement.create).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "draft", publishedAt: null }) as never
    );

    const result = await createAnnouncementRecord({
      title: "下書きタイトル",
      body: "本文",
      category: "other",
      status: "draft",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [],
    });

    expect(prisma.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "draft", publishedAt: null }),
      })
    );
    expect(result.publishedAt).toBeNull();
  });

  it("存在しないIDの削除はAnnouncementNotFoundErrorを送出する", async () => {
    vi.mocked(prisma.announcement.delete).mockRejectedValue(new Error("not found"));

    await expect(deleteAnnouncementRecord("missing")).rejects.toThrow(
      AnnouncementNotFoundError
    );
  });

  it("関連するAnnouncementRecipientStatusを先に削除してからお知らせを削除する（ON DELETE RESTRICT対策）", async () => {
    vi.mocked(prisma.announcementRecipientStatus.deleteMany).mockResolvedValue(
      { count: 2 } as never
    );
    vi.mocked(prisma.announcement.delete).mockResolvedValue(
      baseAnnouncementRecord({ id: "1" }) as never
    );

    await deleteAnnouncementRecord("1");

    expect(prisma.announcementRecipientStatus.deleteMany).toHaveBeenCalledWith({
      where: { announcementId: "1" },
    });
    expect(prisma.announcement.delete).toHaveBeenCalledWith({ where: { id: "1" } });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("作成時に添付ファイル・紐づけドキュメントをネスト書き込みで保存する", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      { id: "doc-1" },
      { id: "doc-2" },
    ] as never);
    vi.mocked(prisma.announcement.create).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        attachments: [
          {
            id: "att-1",
            fileName: "manual.pdf",
            fileType: "application/pdf",
            fileSize: 1024,
            dataUrl: "data:application/pdf;base64,AAAA",
            announcementId: "1",
          },
        ],
        linkedDocuments: [
          { id: "link-1", announcementId: "1", documentId: "doc-1" },
          { id: "link-2", announcementId: "1", documentId: "doc-2" },
        ],
      }) as never
    );

    const result = await createAnnouncementRecord({
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [
        {
          id: "att-1",
          fileName: "manual.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          dataUrl: "data:application/pdf;base64,AAAA",
        },
      ],
      linkedDocumentIds: ["doc-1", "doc-2"],
      translations: [],
    });

    expect(prisma.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attachments: {
            create: [
              {
                fileName: "manual.pdf",
                fileType: "application/pdf",
                fileSize: 1024,
                dataUrl: "data:application/pdf;base64,AAAA",
              },
            ],
          },
          linkedDocuments: {
            create: [{ documentId: "doc-1" }, { documentId: "doc-2" }],
          },
        }),
      })
    );
    expect(result.attachments).toEqual([
      {
        id: "att-1",
        fileName: "manual.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        dataUrl: "data:application/pdf;base64,AAAA",
      },
    ]);
    expect(result.linkedDocumentIds).toEqual(["doc-1", "doc-2"]);
  });

  it("存在しないlinkedDocumentIdsは無言で除外して作成する", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([{ id: "doc-1" }] as never);
    vi.mocked(prisma.announcement.create).mockResolvedValue(
      baseAnnouncementRecord({ id: "1" }) as never
    );

    await createAnnouncementRecord({
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: ["doc-1", "doc-deleted"],
      translations: [],
    });

    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["doc-1", "doc-deleted"] } },
      select: { id: true },
    });
    expect(prisma.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          linkedDocuments: { create: [{ documentId: "doc-1" }] },
        }),
      })
    );
  });

  it("更新時に添付ファイル・紐づけドキュメントを全置換する", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "published" }) as never
    );
    vi.mocked(prisma.document.findMany).mockResolvedValue([{ id: "doc-2" }] as never);
    vi.mocked(prisma.announcement.update).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "published" }) as never
    );

    await updateAnnouncementRecord("1", {
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: ["doc-2"],
      translations: [],
    });

    expect(prisma.announcement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attachments: { deleteMany: {}, create: [] },
          linkedDocuments: { deleteMany: {}, create: [{ documentId: "doc-2" }] },
        }),
      })
    );
  });
});

describe("getAnnouncementRecipientStatuses", () => {
  it("配信対象が全体一律のとき、絞り込みなく担当者取得クエリを発行する", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1" }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "jp-daiso-japan-trading", "JP"),
    ] as never);

    const result = await getAnnouncementRecipientStatuses("1");

    expect(prisma.announcementRecipient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
    expect(result).toHaveLength(1);
    expect(result[0].companyCode).toBe("jp-daiso-japan-trading");
  });

  it("配信対象が特定国のとき、対象国の会社に属する担当者のみに絞り込む", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        targetingScope: "countries",
        targetingCountries: ["VN"],
      }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN"),
    ] as never);

    await getAnnouncementRecipientStatuses("1");

    expect(prisma.announcementRecipient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { company: { country: { in: ["VN"] } } },
      })
    );
  });

  it("存在しないお知らせIDに対しては空配列を返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(null);

    const result = await getAnnouncementRecipientStatuses("missing");

    expect(result).toEqual([]);
  });
});

describe("getAnnouncementTrackingSummary", () => {
  it("対応要否ありのお知らせでは確認済み（人数）・実施済み（会社数）の両方を集計する", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", actionRequired: true }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "jp-daiso-japan-trading", "JP", [
        { completedAt: new Date(), reminderSentAt: null },
      ]),
      recipientRecord("r2", "us-daiso-usa", "US", [
        { completedAt: null, reminderSentAt: null },
      ]),
    ] as never);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      applicantUserRecord("u1", "jp-daiso-japan-trading", "JP", [
        { confirmedAt: new Date(), readReminderSentAt: null },
      ]),
      applicantUserRecord("u2", "us-daiso-usa", "US"),
      applicantUserRecord("u3", "us-daiso-usa", "US"),
    ] as never);

    const result = await getAnnouncementTrackingSummary("1");

    expect(result).toEqual({
      totalRecipientUsers: 3,
      confirmedCount: 1,
      totalCompanies: 2,
      completedCount: 1,
    });
  });

  it("対応要否なしのお知らせでは実施済み件数がnullになる", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", actionRequired: false }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "jp-daiso-japan-trading", "JP", [
        { completedAt: null, reminderSentAt: null },
      ]),
    ] as never);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      applicantUserRecord("u1", "jp-daiso-japan-trading", "JP"),
    ] as never);

    const result = await getAnnouncementTrackingSummary("1");

    expect(result.completedCount).toBeNull();
  });

  it("存在しないお知らせIDに対しては全て0（実施済みはnull）を返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(null);

    const result = await getAnnouncementTrackingSummary("missing");

    expect(result).toEqual({
      totalRecipientUsers: 0,
      confirmedCount: 0,
      totalCompanies: 0,
      completedCount: null,
    });
  });
});

describe("isReminderPendingForCompany", () => {
  it("対応要否が偽のお知らせに対してはfalseを返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", actionRequired: false }) as never
    );

    const result = await isReminderPendingForCompany(
      "1",
      "jp-daiso-japan-trading"
    );

    expect(result).toBe(false);
  });

  it("未対応のままリマインドが送信されている会社に対してtrueを返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", actionRequired: true }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN", [
        { completedAt: null, reminderSentAt: new Date() },
      ]),
    ] as never);

    const result = await isReminderPendingForCompany("1", "vn-daiso-vietnam");

    expect(result).toBe(true);
  });

  it("対応が完了している会社に対してはfalseを返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", actionRequired: true }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN", [
        { completedAt: new Date(), reminderSentAt: new Date() },
      ]),
    ] as never);

    const result = await isReminderPendingForCompany("1", "vn-daiso-vietnam");

    expect(result).toBe(false);
  });
});

describe("sendAnnouncementReminders", () => {
  it("対象担当者ごとにreminderSentAtをupsertする", async () => {
    vi.mocked(prisma.announcementRecipientStatus.upsert).mockResolvedValue(
      {} as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN"),
      recipientRecord("r2", "us-daiso-usa", "US"),
    ] as never);

    await sendAnnouncementReminders("1", ["r1", "r2"]);

    expect(prisma.announcementRecipientStatus.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.announcementRecipientStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { announcementId_recipientId: { announcementId: "1", recipientId: "r1" } },
      })
    );
  });

  it("送信確定処理の後段で、対象担当者が属する会社コード宛にnotifyAnnouncementReminderを呼び出す", async () => {
    vi.mocked(prisma.announcementRecipientStatus.upsert).mockResolvedValue(
      {} as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN"),
      recipientRecord("r2", "vn-daiso-vietnam", "VN"),
    ] as never);

    await sendAnnouncementReminders("1", ["r1", "r2"]);

    expect(notifyAnnouncementReminder).toHaveBeenCalledWith("1", ["vn-daiso-vietnam"]);
  });

  it("空配列を渡した場合は何もせず正常終了する", async () => {
    await expect(sendAnnouncementReminders("1", [])).resolves.toBeUndefined();
    expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalled();
    expect(notifyAnnouncementReminder).not.toHaveBeenCalled();
  });
});

describe("createAnnouncementRecord / updateAnnouncementRecord: 通知呼び出し結線", () => {
  it("公開状態で新規作成した場合、notifyAnnouncementPublishedを呼び出す", async () => {
    vi.mocked(prisma.announcement.create).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "published" }) as never
    );

    await createAnnouncementRecord({
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [{ locale: "en", title: "Title", body: "Body" }],
    });

    expect(notifyAnnouncementPublished).toHaveBeenCalledWith("1");
  });

  it("下書きとして新規作成した場合、notifyAnnouncementPublishedを呼び出さない", async () => {
    vi.mocked(prisma.announcement.create).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "draft", publishedAt: null }) as never
    );

    await createAnnouncementRecord({
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "draft",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [{ locale: "en", title: "Title", body: "Body" }],
    });

    expect(notifyAnnouncementPublished).not.toHaveBeenCalled();
  });

  it("下書き→公開への更新の場合、notifyAnnouncementPublishedを呼び出す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "draft", publishedAt: null }) as never
    );
    vi.mocked(prisma.announcement.update).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "published" }) as never
    );

    await updateAnnouncementRecord("1", {
      title: "タイトル",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [{ locale: "en", title: "Title", body: "Body" }],
    });

    expect(notifyAnnouncementPublished).toHaveBeenCalledWith("1");
  });

  it("公開済みのまま編集保存した場合、notifyAnnouncementPublishedを再度呼び出さない", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "published" }) as never
    );
    vi.mocked(prisma.announcement.update).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", status: "published" }) as never
    );

    await updateAnnouncementRecord("1", {
      title: "タイトル（更新）",
      body: "本文",
      category: "other",
      status: "published",
      targeting: { scope: "all" },
      actionRequired: false,
      sendEmailNotification: false,
      attachments: [],
      linkedDocumentIds: [],
      translations: [{ locale: "en", title: "Title", body: "Body" }],
    });

    expect(notifyAnnouncementPublished).not.toHaveBeenCalled();
  });
});

describe("resolveAnnouncementContent", () => {
  const announcement = {
    title: "日本語タイトル",
    body: "日本語本文",
    translations: [{ locale: "en", title: "English Title", body: "English Body" }],
  };

  it("localeがjaのときAnnouncement.title/bodyを返す", () => {
    expect(resolveAnnouncementContent(announcement, "ja")).toEqual({
      title: "日本語タイトル",
      body: "日本語本文",
    });
  });

  it("対応するAnnouncementTranslationが存在する言語ではその内容を返す", () => {
    expect(resolveAnnouncementContent(announcement, "en")).toEqual({
      title: "English Title",
      body: "English Body",
    });
  });

  it("対応するAnnouncementTranslationが存在しない言語ではenにフォールバックする", () => {
    expect(resolveAnnouncementContent(announcement, "th")).toEqual({
      title: "English Title",
      body: "English Body",
    });
  });

  it("en翻訳も存在しない場合のみjaにフォールバックする", () => {
    const announcementWithoutEn = {
      title: "日本語タイトル",
      body: "日本語本文",
      translations: [],
    };

    expect(resolveAnnouncementContent(announcementWithoutEn, "th")).toEqual({
      title: "日本語タイトル",
      body: "日本語本文",
    });
  });

  describe("country指定（UI言語enのときのみ国の言語で本文を解決）", () => {
    const multi = {
      ...announcement,
      translations: [
        ...announcement.translations,
        { locale: "th", title: "หัวข้อ", body: "เนื้อหา" },
        { locale: "zh-TW", title: "繁體標題", body: "繁體內文" },
      ],
    };

    it("国の言語の翻訳があればenより優先する", () => {
      expect(resolveAnnouncementContent(multi, "en", "TH")).toEqual({
        title: "หัวข้อ",
        body: "เนื้อหา",
      });
    });

    it("言語コードの大文字小文字を区別せず照合する", () => {
      expect(resolveAnnouncementContent(multi, "en", "hk")).toEqual({
        title: "繁體標題",
        body: "繁體內文",
      });
    });

    it("国の言語の翻訳が無ければenにフォールバックする", () => {
      expect(resolveAnnouncementContent(multi, "en", "VN")).toEqual({
        title: "English Title",
        body: "English Body",
      });
    });

    it("en以外のUI言語を選んでいるときは、国の言語よりUI言語の翻訳を優先する", () => {
      expect(resolveAnnouncementContent(multi, "zh-TW", "TH")).toEqual({
        title: "繁體標題",
        body: "繁體內文",
      });
    });

    it("localeがjaのときは国に関わらずjaを返す", () => {
      expect(resolveAnnouncementContent(multi, "ja", "TH")).toEqual({
        title: "日本語タイトル",
        body: "日本語本文",
      });
    });
  });
});

describe("targetApplicantUsersWhere", () => {
  it("配信対象が全体一律のとき、有効なApplicantUser（isActive: true）のみに絞り込むwhereを返す", () => {
    expect(targetApplicantUsersWhere({ targeting: { scope: "all" } })).toEqual({
      isActive: true,
    });
  });

  it("配信対象が特定国のとき、対象国かつ有効なApplicantUser（isActive: true）のみに絞り込むwhereを返す", () => {
    expect(
      targetApplicantUsersWhere({ targeting: { scope: "countries", countries: ["VN", "TH"] } })
    ).toEqual({ isActive: true, company: { country: { in: ["VN", "TH"] } } });
  });
});

describe("recordUserConfirmation", () => {
  it("本人の受信レシートにのみ確認済みを記録する", async () => {
    vi.mocked(prisma.announcementReadReceipt.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.announcementReadReceipt.upsert).mockResolvedValue({} as never);

    await recordUserConfirmation("1", "user-1");

    expect(prisma.announcementReadReceipt.findUnique).toHaveBeenCalledWith({
      where: { announcementId_applicantUserId: { announcementId: "1", applicantUserId: "user-1" } },
    });
    expect(prisma.announcementReadReceipt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { announcementId_applicantUserId: { announcementId: "1", applicantUserId: "user-1" } },
        update: { confirmedAt: expect.any(Date) },
        create: { announcementId: "1", applicantUserId: "user-1", confirmedAt: expect.any(Date) },
      })
    );
  });

  it("既に確認済み（confirmedAt非null）の場合は再度記録しない（記録時刻を上書きしない）", async () => {
    vi.mocked(prisma.announcementReadReceipt.findUnique).mockResolvedValue({
      confirmedAt: new Date("2026-01-01T00:00:00.000Z"),
    } as never);

    await recordUserConfirmation("1", "user-1");

    expect(prisma.announcementReadReceipt.upsert).not.toHaveBeenCalled();
  });

  it("受信レシートが未生成（既読リマインドのみ送信済み等）でもconfirmedAtを新規作成する", async () => {
    vi.mocked(prisma.announcementReadReceipt.findUnique).mockResolvedValue({
      confirmedAt: null,
      readReminderSentAt: new Date("2026-01-01T00:00:00.000Z"),
    } as never);
    vi.mocked(prisma.announcementReadReceipt.upsert).mockResolvedValue({} as never);

    await recordUserConfirmation("1", "user-1");

    expect(prisma.announcementReadReceipt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { confirmedAt: expect.any(Date) },
      })
    );
  });
});

describe("getAnnouncementUserReadStatuses", () => {
  it("配信対象（isActive: true）の全ApplicantUserを受信レシートと結合して返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        targetingScope: "countries",
        targetingCountries: ["VN"],
      }) as never
    );
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      applicantUserRecord("u1", "vn-daiso-vietnam", "VN", [
        { confirmedAt: new Date("2026-01-01T00:00:00.000Z"), readReminderSentAt: null },
      ]),
      applicantUserRecord("u2", "vn-daiso-vietnam", "VN"),
    ] as never);

    const result = await getAnnouncementUserReadStatuses("1");

    expect(prisma.applicantUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, company: { country: { in: ["VN"] } } },
      })
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        applicantUserId: "u1",
        confirmedAt: "2026-01-01T00:00:00.000Z",
      })
    );
    expect(result[1]).toEqual(
      expect.objectContaining({ applicantUserId: "u2", confirmedAt: null })
    );
  });

  it("存在しないお知らせIDに対しては空配列を返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(null);

    const result = await getAnnouncementUserReadStatuses("missing");

    expect(result).toEqual([]);
    expect(prisma.applicantUser.findMany).not.toHaveBeenCalled();
  });
});

describe("getUserSelfConfirmation", () => {
  it("本人の受信レシートのconfirmedAtを返す", async () => {
    vi.mocked(prisma.announcementReadReceipt.findUnique).mockResolvedValue({
      confirmedAt: new Date("2026-01-01T00:00:00.000Z"),
    } as never);

    const result = await getUserSelfConfirmation("1", "user-1");

    expect(result).toBe("2026-01-01T00:00:00.000Z");
  });

  it("受信レシートが存在しない場合はnullを返す", async () => {
    vi.mocked(prisma.announcementReadReceipt.findUnique).mockResolvedValue(null);

    const result = await getUserSelfConfirmation("1", "user-1");

    expect(result).toBeNull();
  });
});

describe("sendUserReadReminders", () => {
  it("未確認の対象ユーザーの受信レシートにreadReminderSentAtを記録し、個人宛通知を呼び出す", async () => {
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      applicantUserRecord("u1", "vn-daiso-vietnam", "VN"),
    ] as never);
    vi.mocked(prisma.announcementReadReceipt.upsert).mockResolvedValue({} as never);

    await sendUserReadReminders("1", ["u1"]);

    expect(prisma.announcementReadReceipt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { announcementId_applicantUserId: { announcementId: "1", applicantUserId: "u1" } },
        update: { readReminderSentAt: expect.any(Date) },
        create: { announcementId: "1", applicantUserId: "u1", readReminderSentAt: expect.any(Date) },
      })
    );
    expect(notifyAnnouncementUserReadReminder).toHaveBeenCalledWith("1", [
      { email: "u1@example.com", preferredLocale: "en" },
    ]);
  });

  it("既に確認済みのユーザーはリマインド対象・記録の両方から除外する", async () => {
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      applicantUserRecord("u1", "vn-daiso-vietnam", "VN", [
        { confirmedAt: new Date("2026-01-01T00:00:00.000Z"), readReminderSentAt: null },
      ]),
    ] as never);

    await sendUserReadReminders("1", ["u1"]);

    expect(prisma.announcementReadReceipt.upsert).not.toHaveBeenCalled();
    expect(notifyAnnouncementUserReadReminder).not.toHaveBeenCalled();
  });

  it("空配列を渡した場合は何もせず正常終了する", async () => {
    await expect(sendUserReadReminders("1", [])).resolves.toBeUndefined();
    expect(prisma.applicantUser.findMany).not.toHaveBeenCalled();
    expect(prisma.announcementReadReceipt.upsert).not.toHaveBeenCalled();
    expect(notifyAnnouncementUserReadReminder).not.toHaveBeenCalled();
  });
});

describe("recordCompanyCompletion", () => {
  it("対応要否が真のお知らせに対し、未実施の担当者のみ実施済み日時を記録する", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", actionRequired: true }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN"),
    ] as never);
    vi.mocked(prisma.announcementRecipientStatus.upsert).mockResolvedValue({} as never);

    await recordCompanyCompletion("1", "vn-daiso-vietnam");

    expect(prisma.announcementRecipientStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { completedAt: expect.any(Date) },
        create: { announcementId: "1", recipientId: "r1", completedAt: expect.any(Date) },
      })
    );
  });

  it("対応要否が偽のお知らせに対しては何も記録しない", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", actionRequired: false }) as never
    );

    await recordCompanyCompletion("1", "vn-daiso-vietnam");

    expect(prisma.announcementRecipient.findMany).not.toHaveBeenCalled();
    expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalled();
  });

  it("既に実施済みの担当者は再度記録されない", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", actionRequired: true }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN", [
        { completedAt: new Date("2026-01-01T00:00:00.000Z"), reminderSentAt: null },
      ]),
    ] as never);

    await recordCompanyCompletion("1", "vn-daiso-vietnam");

    expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalled();
  });
});

describe("getAnnouncementSelfStatusForCompany", () => {
  it("対象担当者全員が実施済みのときのみ対応完了日時を返す（確認済みは扱わない）", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1" }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN", [
        { completedAt: new Date("2026-01-01T00:00:00.000Z"), reminderSentAt: null },
      ]),
      recipientRecord("r2", "vn-daiso-vietnam", "VN", [
        { completedAt: new Date("2026-01-02T00:00:00.000Z"), reminderSentAt: null },
      ]),
    ] as never);

    const result = await getAnnouncementSelfStatusForCompany("1", "vn-daiso-vietnam");

    expect(result).toEqual({ completedAt: "2026-01-01T00:00:00.000Z" });
  });

  it("1人でも未記録の担当者がいる場合はnullを返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1" }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN", [
        { completedAt: new Date("2026-01-01T00:00:00.000Z"), reminderSentAt: null },
      ]),
      recipientRecord("r2", "vn-daiso-vietnam", "VN"),
    ] as never);

    const result = await getAnnouncementSelfStatusForCompany("1", "vn-daiso-vietnam");

    expect(result.completedAt).toBeNull();
  });

  it("対象担当者が1人も存在しない場合はnullを返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        targetingScope: "countries",
        targetingCountries: ["VN"],
      }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([] as never);

    const result = await getAnnouncementSelfStatusForCompany("1", "jp-daiso-japan-trading");

    expect(result).toEqual({ completedAt: null });
  });

  it("存在しないお知らせIDに対してはnullを返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(null);

    const result = await getAnnouncementSelfStatusForCompany("missing", "vn-daiso-vietnam");

    expect(result).toEqual({ completedAt: null });
  });
});

describe("getAnnouncementSelfStatuses", () => {
  it("空配列を渡した場合はクエリを発行せず空のMapを返す", async () => {
    const result = await getAnnouncementSelfStatuses([], "user-1", "vn-daiso-vietnam");

    expect(result.size).toBe(0);
    expect(prisma.announcementReadReceipt.findMany).not.toHaveBeenCalled();
    expect(prisma.announcementRecipient.findMany).not.toHaveBeenCalled();
  });

  it("お知らせ件数に関わらずfindManyが各1回だけ呼ばれる（N+1回避）", async () => {
    vi.mocked(prisma.announcementReadReceipt.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([] as never);

    await getAnnouncementSelfStatuses(
      [
        { id: "a1", targeting: { scope: "all" } },
        { id: "a2", targeting: { scope: "all" } },
        { id: "a3", targeting: { scope: "all" } },
      ],
      "user-1",
      "vn-daiso-vietnam"
    );

    expect(prisma.announcementReadReceipt.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.announcementRecipient.findMany).toHaveBeenCalledTimes(1);
  });

  it("本人が確認済み・自社の対象担当者全員が実施済みのお知らせはconfirmedAt/completedAtが返る", async () => {
    vi.mocked(prisma.announcementReadReceipt.findMany).mockResolvedValue([
      { announcementId: "a1", confirmedAt: new Date("2026-01-01T00:00:00.000Z") },
    ] as never);
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      {
        id: "r1",
        company: { country: "VN", applicantUsers: [] },
        statuses: [{ announcementId: "a1", completedAt: new Date("2026-01-02T00:00:00.000Z") }],
      },
    ] as never);

    const result = await getAnnouncementSelfStatuses(
      [{ id: "a1", targeting: { scope: "all" } }],
      "user-1",
      "vn-daiso-vietnam"
    );

    expect(result.get("a1")).toEqual({
      confirmedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it("1人でも未実施の担当者がいる場合はcompletedAtがnullになる", async () => {
    vi.mocked(prisma.announcementReadReceipt.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      {
        id: "r1",
        company: { country: "VN", applicantUsers: [] },
        statuses: [{ announcementId: "a1", completedAt: new Date("2026-01-02T00:00:00.000Z") }],
      },
      {
        id: "r2",
        company: { country: "VN", applicantUsers: [] },
        statuses: [],
      },
    ] as never);

    const result = await getAnnouncementSelfStatuses(
      [{ id: "a1", targeting: { scope: "all" } }],
      "user-1",
      "vn-daiso-vietnam"
    );

    expect(result.get("a1")?.completedAt).toBeNull();
    expect(result.get("a1")?.confirmedAt).toBeNull();
  });

  it("配信対象国に自社の国が含まれない場合は対象0件としてcompletedAtがnullになる", async () => {
    vi.mocked(prisma.announcementReadReceipt.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      {
        id: "r1",
        company: { country: "JP", applicantUsers: [] },
        statuses: [{ announcementId: "a1", completedAt: new Date("2026-01-02T00:00:00.000Z") }],
      },
    ] as never);

    const result = await getAnnouncementSelfStatuses(
      [{ id: "a1", targeting: { scope: "countries", countries: ["VN"] } }],
      "user-1",
      "jp-daiso-japan-trading"
    );

    expect(result.get("a1")).toEqual({ confirmedAt: null, completedAt: null });
  });
});

describe("個人単位の確認済み記録・会社単位の実施済み記録が既存の集計・未対応者一覧に反映される（統合確認）", () => {
  it("本人単位の確認済み記録後、getAnnouncementTrackingSummaryの確認済み人数（人数ベース）に反映される", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", actionRequired: false }) as never
    );
    vi.mocked(prisma.announcementReadReceipt.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.announcementReadReceipt.upsert).mockResolvedValue({} as never);

    await recordUserConfirmation("1", "u1");

    // 記録後は同一テーブルを参照するgetAnnouncementUserReadStatuses/Summaryに
    // 反映される前提のため、記録済み状態を模したfindManyの戻り値で確認する。
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      applicantUserRecord("u1", "vn-daiso-vietnam", "VN", [
        { confirmedAt: new Date(), readReminderSentAt: null },
      ]),
    ] as never);
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([] as never);

    const summary = await getAnnouncementTrackingSummary("1");

    expect(summary.confirmedCount).toBe(1);
  });

  it("実施済み記録後、未対応者一覧（getAnnouncementRecipientStatuses）から対象会社が除外される", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", actionRequired: true }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN"),
    ] as never);
    vi.mocked(prisma.announcementRecipientStatus.upsert).mockResolvedValue({} as never);

    await recordCompanyCompletion("1", "vn-daiso-vietnam");

    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN", [
        { completedAt: new Date(), reminderSentAt: null },
      ]),
    ] as never);

    const statuses = await getAnnouncementRecipientStatuses("1");
    const unresolved = statuses.filter(
      (status) => status.companyCode === "vn-daiso-vietnam" && status.completedAt === null
    );

    expect(unresolved).toHaveLength(0);
  });
});


describe("一覧・集計クエリは添付本体（dataUrl）を読み込まない", () => {
  beforeEach(() => {
    vi.mocked(prisma.announcement.findMany).mockReset();
    vi.mocked(prisma.announcement.findUnique).mockReset();
  });

  it("listAnnouncementsVisibleToCountryは添付をメタデータだけselectし、結果にdataUrlを含めない", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      baseAnnouncementRecord({
        id: "1",
        attachments: [
          {
            id: "att-1",
            fileName: "a.png",
            fileType: "image/png",
            fileSize: 10,
            // 万一select漏れで返ってきても、整形結果には含めない
            dataUrl: "data:image/png;base64,AAAA",
            announcementId: "1",
          },
        ],
      }),
    ] as never);

    const result = await listAnnouncementsVisibleToCountry("VN");

    const args = vi.mocked(prisma.announcement.findMany).mock.calls[0][0] as {
      include: { attachments: unknown };
    };
    expect(args.include.attachments).toEqual({
      select: { id: true, fileName: true, fileType: true, fileSize: true },
    });
    expect(result[0].attachments).toEqual([
      { id: "att-1", fileName: "a.png", fileType: "image/png", fileSize: 10 },
    ]);
  });

  it("listAllAnnouncementsは添付をメタデータだけselectし、作成者名を含める", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      { ...baseAnnouncementRecord({ id: "1" }), createdBy: { displayName: "担当A" } },
    ] as never);

    const result = await listAllAnnouncements();

    const args = vi.mocked(prisma.announcement.findMany).mock.calls[0][0] as {
      include: { attachments: unknown; createdBy: unknown };
    };
    expect(args.include.attachments).toEqual({
      select: { id: true, fileName: true, fileType: true, fileSize: true },
    });
    expect(args.include.createdBy).toEqual({ select: { displayName: true } });
    expect(result[0].createdByName).toBe("担当A");
  });

  it("findAnnouncementByIdは従来どおり添付本体を含めて取得する（編集画面用）", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1" }) as never
    );

    await findAnnouncementById("1");

    expect(prisma.announcement.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.objectContaining({ attachments: true }) })
    );
  });

  it("トラッキング集計系は添付・翻訳を読み込まず、配信対象と対応要否の列だけselectする", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1" }) as never
    );

    await getAnnouncementRecipientStatuses("1");
    await getAnnouncementUserReadStatuses("1");
    await isReminderPendingForCompany("1", "X");

    const calls = vi.mocked(prisma.announcement.findUnique).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(3);
    for (const [args] of calls) {
      const typed = args as { select?: Record<string, boolean>; include?: unknown };
      expect(typed.include).toBeUndefined();
      expect(typed.select).toEqual({
        id: true,
        actionRequired: true,
        targetingScope: true,
        targetingCountries: true,
        targetingUserIds: true,
        targetingCompanyIds: true,
      });
    }
  });
});

describe("getAnnouncementTrackingStatusesBulk", () => {
  function recipientWithStatuses(
    id: string,
    companyCode: string,
    country: string,
    statuses: { announcementId: string; completedAt: Date | null; reminderSentAt: Date | null }[]
  ) {
    return { ...recipientRecord(id, companyCode, country), statuses };
  }

  function userWithReceipts(
    id: string,
    companyCode: string,
    country: string,
    receipts: {
      announcementId: string;
      confirmedAt: Date | null;
      readReminderSentAt: Date | null;
    }[],
    isActive = true
  ) {
    return { ...applicantUserRecord(id, companyCode, country), isActive, announcementReadReceipts: receipts };
  }

  beforeEach(() => {
    vi.mocked(prisma.announcementRecipient.findMany).mockReset();
    vi.mocked(prisma.applicantUser.findMany).mockReset();
    vi.mocked(prisma.announcement.findUnique).mockReset();
    vi.mocked(prisma.announcement.findMany).mockReset();
  });

  it("お知らせが0件ならクエリを発行せず空を返す", async () => {
    const result = await getAnnouncementTrackingStatusesBulk([]);

    expect(result).toEqual({ recipientStatuses: {}, userReadStatuses: {} });
    expect(prisma.announcementRecipient.findMany).not.toHaveBeenCalled();
    expect(prisma.applicantUser.findMany).not.toHaveBeenCalled();
  });

  it("お知らせ件数によらず、担当者・申請者の2クエリだけで済み、お知らせ本体は読み込まない", async () => {
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([] as never);

    await getAnnouncementTrackingStatusesBulk(
      Array.from({ length: 50 }, (_, index) => ({
        id: `a${index}`,
        targeting: { scope: "all" as const },
      }))
    );

    expect(prisma.announcementRecipient.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.applicantUser.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.announcement.findUnique).not.toHaveBeenCalled();
    expect(prisma.announcement.findMany).not.toHaveBeenCalled();
    const recipientArgs = vi.mocked(prisma.announcementRecipient.findMany).mock.calls[0][0] as {
      include: { statuses: { where: { announcementId: { in: string[] } } } };
    };
    expect(recipientArgs.include.statuses.where.announcementId.in).toHaveLength(50);
  });

  it("配信対象ごとに、1件ずつ取得した場合と同じ母集団・状態に振り分ける", async () => {
    const t = new Date("2026-02-01T00:00:00.000Z");
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientWithStatuses("r-vn", "VN1", "VN", [
        { announcementId: "a-all", completedAt: t, reminderSentAt: null },
        { announcementId: "a-vn", completedAt: null, reminderSentAt: t },
      ]),
      recipientWithStatuses("r-th", "TH1", "TH", []),
      recipientWithStatuses("r-us", "US1", "US", []),
    ] as never);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      userWithReceipts("u-vn", "VN1", "VN", [
        { announcementId: "a-all", confirmedAt: t, readReminderSentAt: null },
        { announcementId: "a-vn", confirmedAt: null, readReminderSentAt: null },
      ]),
      userWithReceipts("u-th", "TH1", "TH", []),
      // 無効化済み: 個人単位の母集団からは除外されるが、所属会社は個人指定の会社単位の母集団に残る
      userWithReceipts("u-us-inactive", "US1", "US", [], false),
    ] as never);

    const result = await getAnnouncementTrackingStatusesBulk([
      { id: "a-all", targeting: { scope: "all" } },
      { id: "a-vn", targeting: { scope: "countries", countries: ["VN"] } },
      {
        id: "a-users",
        targeting: { scope: "users", userIds: ["u-us-inactive"], companyIds: ["company-TH1"] },
      },
    ]);

    const companyCodes = (views: { companyCode: string }[]) => views.map((v) => v.companyCode);
    expect(companyCodes(result.recipientStatuses["a-all"])).toEqual(["VN1", "TH1", "US1"]);
    expect(companyCodes(result.recipientStatuses["a-vn"])).toEqual(["VN1"]);
    expect(companyCodes(result.recipientStatuses["a-users"])).toEqual(["TH1", "US1"]);

    // 状態はお知らせIDごとに分かれる
    expect(result.recipientStatuses["a-all"][0]).toEqual(
      expect.objectContaining({ completedAt: t.toISOString(), reminderSentAt: null })
    );
    expect(result.recipientStatuses["a-vn"][0]).toEqual(
      expect.objectContaining({ completedAt: null, reminderSentAt: t.toISOString() })
    );

    expect(result.userReadStatuses["a-all"].map((v) => v.applicantUserId)).toEqual(["u-vn", "u-th"]);
    expect(result.userReadStatuses["a-vn"].map((v) => v.applicantUserId)).toEqual(["u-vn"]);
    // 無効化済みユーザーを個人指定しても、個人単位の母集団には入らない。会社指定のTH1所属は入る
    expect(result.userReadStatuses["a-users"].map((v) => v.applicantUserId)).toEqual(["u-th"]);
    expect(result.userReadStatuses["a-all"][0].confirmedAt).toBe(t.toISOString());
    expect(result.userReadStatuses["a-vn"][0].confirmedAt).toBeNull();
  });
});

describe("getAnnouncementTrackingStatusesBulk: 1件ずつ取得した結果との突き合わせ", () => {
  // Prismaの`where`をメモリ上で評価する最小のオラクル。テストで使う形（in / OR / AND /
  // 真偽値 / ネスト / applicantUsers.some）以外を受け取ったら、黙って通さず例外にする。
  type Row = Record<string, unknown>;
  function matches(row: Row, where: Row): boolean {
    return Object.entries(where).every(([key, condition]) => {
      if (key === "OR") {
        return (condition as Row[]).some((sub) => matches(row, sub));
      }
      if (key === "AND") {
        return (condition as Row[]).every((sub) => matches(row, sub));
      }
      if (key === "applicantUsers") {
        const { some } = condition as { some: Row };
        return (row.applicantUsers as Row[]).some((user) => matches(user, some));
      }
      const value = row[key];
      if (typeof condition === "boolean" || typeof condition === "string") {
        return value === condition;
      }
      const object = condition as Row;
      if ("in" in object) {
        return (object.in as unknown[]).includes(value);
      }
      if (value && typeof value === "object") {
        return matches(value as Row, object);
      }
      throw new Error(`oracle: 未対応のwhere条件 ${key}`);
    });
  }

  const t1 = new Date("2026-02-01T00:00:00.000Z");
  const t2 = new Date("2026-03-01T00:00:00.000Z");
  const companies = {
    VN1: { id: "company-VN1", companyCode: "VN1", name: "Company VN1", country: "VN" },
    TH1: { id: "company-TH1", companyCode: "TH1", name: "Company TH1", country: "TH" },
    US1: { id: "company-US1", companyCode: "US1", name: "Company US1", country: "US" },
    JP1: { id: "company-JP1", companyCode: "JP1", name: "Company JP1", country: "JP" },
  };
  const userSeeds = [
    { id: "u-vn-a", code: "VN1", isActive: true },
    { id: "u-vn-b", code: "VN1", isActive: true },
    { id: "u-vn-off", code: "VN1", isActive: false },
    { id: "u-th", code: "TH1", isActive: true },
    { id: "u-us-off", code: "US1", isActive: false },
  ] as const;

  // 状態（既読・確認済み・実施済み）の有無を、お知らせ・会社・個人ごとに混在させる
  const recipientStatusRows: Record<string, Record<string, Row>> = {
    VN1: { "a-all": { completedAt: t1, reminderSentAt: null }, "a-vn": { completedAt: null, reminderSentAt: t2 } },
    TH1: { "a-users-company": { completedAt: t2, reminderSentAt: t1 } },
    US1: {},
    JP1: { "a-all": { completedAt: null, reminderSentAt: null } },
  };
  const receiptRows: Record<string, Record<string, Row>> = {
    "u-vn-a": { "a-all": { confirmedAt: t1, readReminderSentAt: null, confirmers: [{ name: "A", confirmedAt: t1 }] } },
    "u-vn-b": { "a-vn": { confirmedAt: null, readReminderSentAt: t2, confirmers: [] } },
    "u-th": { "a-users-company": { confirmedAt: t2, readReminderSentAt: null, confirmers: [] } },
  };

  const scenarios: { id: string; targeting: AnnouncementTargeting }[] = [
    { id: "a-all", targeting: { scope: "all" } },
    { id: "a-vn", targeting: { scope: "countries", countries: ["VN"] } },
    { id: "a-vn-us", targeting: { scope: "countries", countries: ["VN", "US"] } },
    { id: "a-no-country", targeting: { scope: "countries", countries: [] } },
    { id: "a-users-person", targeting: { scope: "users", userIds: ["u-vn-a"], companyIds: [] } },
    { id: "a-users-company", targeting: { scope: "users", userIds: [], companyIds: ["company-TH1"] } },
    { id: "a-users-empty", targeting: { scope: "users", userIds: [], companyIds: [] } },
    { id: "a-users-inactive-person", targeting: { scope: "users", userIds: ["u-us-off"], companyIds: [] } },
    {
      id: "a-users-mixed",
      targeting: { scope: "users", userIds: ["u-vn-off", "u-th"], companyIds: ["company-JP1"] },
    },
  ];

  const users = userSeeds.map((seed) => ({
    id: seed.id,
    email: `${seed.id}@example.com`,
    displayName: `担当者-${seed.id}`,
    companyId: companies[seed.code].id,
    isActive: seed.isActive,
    preferredLocale: "en",
    company: companies[seed.code],
    announcementReadReceipts: Object.entries(receiptRows[seed.id] ?? {}).map(([announcementId, row]) => ({
      announcementId,
      ...row,
    })),
  }));
  const recipients = (Object.keys(companies) as (keyof typeof companies)[]).map((code) => ({
    id: `r-${code}`,
    companyId: companies[code].id,
    contactName: `担当者-r-${code}`,
    company: {
      ...companies[code],
      applicantUsers: users.filter((user) => user.companyId === companies[code].id),
    },
    statuses: Object.entries(recipientStatusRows[code]).map(([announcementId, row]) => ({
      announcementId,
      ...row,
    })),
  }));

  // `include`内の`where`（お知らせIDでのネスト絞り込み）も再現する
  function withNestedFilter(rows: Row[], key: string, args: { include?: Row }): Row[] {
    const nested = (args.include?.[key] as { where?: Row } | undefined)?.where;
    return rows.map((row) => ({
      ...row,
      [key]: (row[key] as Row[]).filter((child) => matches(child, nested ?? {})),
    }));
  }

  beforeEach(() => {
    vi.mocked(prisma.announcementRecipient.findMany).mockReset();
    vi.mocked(prisma.applicantUser.findMany).mockReset();
    vi.mocked(prisma.announcement.findUnique).mockReset();
    vi.mocked(prisma.announcementRecipient.findMany).mockImplementation((async (args: {
      where?: Row;
      include?: Row;
    }) =>
      withNestedFilter(
        recipients.filter((recipient) => matches(recipient, args.where ?? {})),
        "statuses",
        args
      )) as never);
    vi.mocked(prisma.applicantUser.findMany).mockImplementation((async (args: {
      where?: Row;
      include?: Row;
    }) =>
      withNestedFilter(
        users.filter((user) => matches(user, args.where ?? {})),
        "announcementReadReceipts",
        args
      )) as never);
    vi.mocked(prisma.announcement.findUnique).mockImplementation((async (args: { where: { id: string } }) => {
      const scenario = scenarios.find((item) => item.id === args.where.id);
      if (!scenario) {
        return null;
      }
      const { targeting } = scenario;
      return baseAnnouncementRecord({
        id: scenario.id,
        targetingScope: targeting.scope,
        targetingCountries: targeting.scope === "countries" ? targeting.countries : [],
        targetingUserIds: targeting.scope === "users" ? targeting.userIds : [],
        targetingCompanyIds: targeting.scope === "users" ? targeting.companyIds : [],
      });
    }) as never);
  });

  it("全スコープ・全ケースで、一括版と1件ずつ版の結果（母集団・順序・状態）が一致する", async () => {
    const bulk = await getAnnouncementTrackingStatusesBulk(scenarios);

    for (const { id } of scenarios) {
      expect(bulk.recipientStatuses[id], `recipientStatuses: ${id}`).toEqual(
        await getAnnouncementRecipientStatuses(id)
      );
      expect(bulk.userReadStatuses[id], `userReadStatuses: ${id}`).toEqual(
        await getAnnouncementUserReadStatuses(id)
      );
    }
  });

  it("突き合わせの前提確認: 無効ユーザー除外・空指定・複数ユーザー会社が実際に検証対象に含まれる", async () => {
    const ids = async (id: string) =>
      (await getAnnouncementUserReadStatuses(id)).map((view) => view.applicantUserId);

    // 同一会社に複数ユーザー。無効ユーザーは個人単位から除外
    expect(await ids("a-vn")).toEqual(["u-vn-a", "u-vn-b"]);
    // 空指定は誰も対象にならない
    expect(await ids("a-users-empty")).toEqual([]);
    expect((await getAnnouncementRecipientStatuses("a-users-empty")).length).toBe(0);
    // 無効ユーザーを個人指定しても個人単位は空、会社単位では所属会社が残る
    expect(await ids("a-users-inactive-person")).toEqual([]);
    expect(
      (await getAnnouncementRecipientStatuses("a-users-inactive-person")).map((view) => view.companyCode)
    ).toEqual(["US1"]);
  });
});
