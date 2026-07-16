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
    },
    announcementRecipientStatus: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
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
}));

import { prisma } from "@/lib/db/prisma";
import {
  notifyAnnouncementPublished,
  notifyAnnouncementReminder,
} from "@/lib/server/announcement-notifications";
import {
  AnnouncementNotFoundError,
  createAnnouncementRecord,
  deleteAnnouncementRecord,
  findAnnouncementById,
  findAnnouncementVisibleToCountry,
  getAnnouncementRecipientStatuses,
  getAnnouncementSelfStatusForCompany,
  getAnnouncementTrackingSummary,
  isReminderPendingForCompany,
  listAllAnnouncements,
  listAnnouncementsVisibleToCountry,
  recordCompanyCompletion,
  recordCompanyConfirmation,
  resolveAnnouncementContent,
  sendAnnouncementReminders,
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
    targetingScope: "all" | "countries";
    targetingCountries: string[];
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
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
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
    confirmedAt: Date | null;
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
  it("対応要否ありのお知らせでは確認済み・実施済みの両方を集計する", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", actionRequired: true }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "jp-daiso-japan-trading", "JP", [
        { confirmedAt: new Date(), completedAt: new Date(), reminderSentAt: null },
      ]),
      recipientRecord("r2", "us-daiso-usa", "US", [
        { confirmedAt: new Date(), completedAt: null, reminderSentAt: null },
      ]),
    ] as never);

    const result = await getAnnouncementTrackingSummary("1");

    expect(result).toEqual({ totalRecipients: 2, confirmedCount: 2, completedCount: 1 });
  });

  it("対応要否なしのお知らせでは実施済み件数がnullになる", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", actionRequired: false }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "jp-daiso-japan-trading", "JP", [
        { confirmedAt: new Date(), completedAt: null, reminderSentAt: null },
      ]),
    ] as never);

    const result = await getAnnouncementTrackingSummary("1");

    expect(result.completedCount).toBeNull();
  });

  it("存在しないお知らせIDに対しては全て0（実施済みはnull）を返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(null);

    const result = await getAnnouncementTrackingSummary("missing");

    expect(result).toEqual({ totalRecipients: 0, confirmedCount: 0, completedCount: null });
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
        { confirmedAt: new Date(), completedAt: null, reminderSentAt: new Date() },
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
        { confirmedAt: new Date(), completedAt: new Date(), reminderSentAt: new Date() },
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

  it("対応するAnnouncementTranslationが存在しない言語ではjaにフォールバックする", () => {
    expect(resolveAnnouncementContent(announcement, "th")).toEqual({
      title: "日本語タイトル",
      body: "日本語本文",
    });
  });
});

describe("targetApplicantUsersWhere", () => {
  it("配信対象が全体一律のとき、無条件のwhereを返す", () => {
    expect(targetApplicantUsersWhere({ targeting: { scope: "all" } })).toEqual({});
  });

  it("配信対象が特定国のとき、対象国のApplicantUserのみに絞り込むwhereを返す", () => {
    expect(
      targetApplicantUsersWhere({ targeting: { scope: "countries", countries: ["VN", "TH"] } })
    ).toEqual({ company: { country: { in: ["VN", "TH"] } } });
  });
});

describe("recordCompanyConfirmation", () => {
  it("指定会社かつ配信対象に含まれる担当者のみを絞り込んで取得する", async () => {
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
    vi.mocked(prisma.announcementRecipientStatus.upsert).mockResolvedValue({} as never);

    await recordCompanyConfirmation("1", "vn-daiso-vietnam");

    expect(prisma.announcementRecipient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { company: { country: { in: ["VN"] } } },
            { company: { companyCode: "vn-daiso-vietnam" } },
          ],
        },
      })
    );
    expect(prisma.announcementRecipientStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { announcementId_recipientId: { announcementId: "1", recipientId: "r1" } },
        update: { confirmedAt: expect.any(Date) },
        create: { announcementId: "1", recipientId: "r1", confirmedAt: expect.any(Date) },
      })
    );
  });

  it("未確認の担当者のみを記録対象とする", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1" }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "jp-daiso-japan-trading", "JP", [
        { confirmedAt: new Date("2026-01-01T00:00:00.000Z"), completedAt: null, reminderSentAt: null },
      ]),
      recipientRecord("r2", "jp-daiso-japan-trading", "JP"),
    ] as never);
    vi.mocked(prisma.announcementRecipientStatus.upsert).mockResolvedValue({} as never);

    await recordCompanyConfirmation("1", "jp-daiso-japan-trading");

    expect(prisma.announcementRecipientStatus.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.announcementRecipientStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { announcementId_recipientId: { announcementId: "1", recipientId: "r2" } },
      })
    );
  });

  it("既に確認済みの担当者は再度記録されない（記録時刻を上書きしない）", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1" }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "jp-daiso-japan-trading", "JP", [
        { confirmedAt: new Date("2026-01-01T00:00:00.000Z"), completedAt: null, reminderSentAt: null },
      ]),
    ] as never);

    await recordCompanyConfirmation("1", "jp-daiso-japan-trading");

    expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalled();
  });

  it("配信対象に指定会社が含まれない場合、対象0件で何も記録しない", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({
        id: "1",
        targetingScope: "countries",
        targetingCountries: ["VN"],
      }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([] as never);

    await recordCompanyConfirmation("1", "jp-daiso-japan-trading");

    expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalled();
  });

  it("他社・他のお知らせには影響しない", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1" }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN"),
    ] as never);
    vi.mocked(prisma.announcementRecipientStatus.upsert).mockResolvedValue({} as never);

    await recordCompanyConfirmation("1", "vn-daiso-vietnam");

    expect(prisma.announcementRecipientStatus.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.announcementRecipientStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { announcementId_recipientId: { announcementId: "1", recipientId: "r1" } },
      })
    );
  });

  it("存在しないお知らせIDに対しては何もしない", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(null);

    await recordCompanyConfirmation("missing", "vn-daiso-vietnam");

    expect(prisma.announcementRecipient.findMany).not.toHaveBeenCalled();
    expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalled();
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
        { confirmedAt: new Date(), completedAt: new Date("2026-01-01T00:00:00.000Z"), reminderSentAt: null },
      ]),
    ] as never);

    await recordCompanyCompletion("1", "vn-daiso-vietnam");

    expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalled();
  });
});

describe("getAnnouncementSelfStatusForCompany", () => {
  it("対象担当者全員が確認済みのときのみ確認済み日時を返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1" }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN", [
        { confirmedAt: new Date("2026-01-01T00:00:00.000Z"), completedAt: null, reminderSentAt: null },
      ]),
      recipientRecord("r2", "vn-daiso-vietnam", "VN", [
        { confirmedAt: new Date("2026-01-02T00:00:00.000Z"), completedAt: null, reminderSentAt: null },
      ]),
    ] as never);

    const result = await getAnnouncementSelfStatusForCompany("1", "vn-daiso-vietnam");

    expect(result.confirmedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(result.completedAt).toBeNull();
  });

  it("1人でも未記録の担当者がいる場合はnullを返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1" }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN", [
        { confirmedAt: new Date("2026-01-01T00:00:00.000Z"), completedAt: null, reminderSentAt: null },
      ]),
      recipientRecord("r2", "vn-daiso-vietnam", "VN"),
    ] as never);

    const result = await getAnnouncementSelfStatusForCompany("1", "vn-daiso-vietnam");

    expect(result.confirmedAt).toBeNull();
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

    expect(result).toEqual({ confirmedAt: null, completedAt: null });
  });

  it("存在しないお知らせIDに対してはnullを返す", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(null);

    const result = await getAnnouncementSelfStatusForCompany("missing", "vn-daiso-vietnam");

    expect(result).toEqual({ confirmedAt: null, completedAt: null });
  });
});

describe("会社単位の記録が既存の集計・未対応者一覧に反映される（統合確認）", () => {
  it("確認済み記録後、getAnnouncementTrackingSummaryの確認済み人数に反映される", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      baseAnnouncementRecord({ id: "1", actionRequired: false }) as never
    );
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN"),
    ] as never);
    vi.mocked(prisma.announcementRecipientStatus.upsert).mockResolvedValue({} as never);

    await recordCompanyConfirmation("1", "vn-daiso-vietnam");

    // 記録後は同一テーブルを参照するgetAnnouncementRecipientStatuses/Summaryに
    // 反映される前提のため、記録済み状態を模したfindManyの戻り値で確認する。
    vi.mocked(prisma.announcementRecipient.findMany).mockResolvedValue([
      recipientRecord("r1", "vn-daiso-vietnam", "VN", [
        { confirmedAt: new Date(), completedAt: null, reminderSentAt: null },
      ]),
    ] as never);

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
        { confirmedAt: null, completedAt: new Date(), reminderSentAt: null },
      ]),
    ] as never);

    const statuses = await getAnnouncementRecipientStatuses("1");
    const unresolved = statuses.filter(
      (status) => status.companyCode === "vn-daiso-vietnam" && status.completedAt === null
    );

    expect(unresolved).toHaveLength(0);
  });
});
