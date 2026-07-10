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
      findMany: vi.fn(),
    },
    announcementRecipientStatus: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  AnnouncementNotFoundError,
  createAnnouncementRecord,
  deleteAnnouncementRecord,
  findAnnouncementById,
  findAnnouncementVisibleToCountry,
  getAnnouncementRecipientStatuses,
  getAnnouncementTrackingSummary,
  isReminderPendingForCompany,
  listAllAnnouncements,
  listAnnouncementsVisibleToCountry,
  sendAnnouncementReminders,
  updateAnnouncementRecord,
} from "@/lib/server/announcement-service";

function baseAnnouncementRecord(
  overrides: Partial<{
    id: string;
    title: string;
    body: string;
    category: "maintenance" | "policy" | "incident" | "other";
    publishedAt: Date;
    actionRequired: boolean;
    targetingScope: "all" | "countries";
    targetingCountries: string[];
    publishStartDate: Date | null;
    publishEndDate: Date | null;
    dueDate: Date | null;
  }> = {}
) {
  return {
    id: "announcement-1",
    title: "タイトル",
    body: "本文",
    category: "other" as const,
    publishedAt: new Date("2026-07-01T09:00:00.000Z"),
    actionRequired: false,
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    publishStartDate: null,
    publishEndDate: null,
    dueDate: null,
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
  it("絞り込みなしで全件を取得する", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      baseAnnouncementRecord({ id: "1" }),
      baseAnnouncementRecord({ id: "2" }),
    ] as never);

    const result = await listAllAnnouncements();

    expect(result.map((item) => item.id)).toEqual(["1", "2"]);
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
      targeting: { scope: "countries", countries: ["JP"] },
      actionRequired: false,
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
      targeting: { scope: "all" },
      actionRequired: true,
      publishStartDate: "2026-08-01",
      publishEndDate: "2026-08-31",
      dueDate: "2026-08-15",
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
      targeting: { scope: "all" },
      actionRequired: false,
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
    vi.mocked(prisma.announcement.update).mockRejectedValue(new Error("not found"));

    await expect(
      updateAnnouncementRecord("missing", {
        title: "t",
        body: "b",
        category: "other",
        targeting: { scope: "all" },
        actionRequired: false,
      })
    ).rejects.toThrow(AnnouncementNotFoundError);
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

    await sendAnnouncementReminders("1", ["r1", "r2"]);

    expect(prisma.announcementRecipientStatus.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.announcementRecipientStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { announcementId_recipientId: { announcementId: "1", recipientId: "r1" } },
      })
    );
  });

  it("空配列を渡した場合は何もせず正常終了する", async () => {
    await expect(sendAnnouncementReminders("1", [])).resolves.toBeUndefined();
    expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalled();
  });
});
