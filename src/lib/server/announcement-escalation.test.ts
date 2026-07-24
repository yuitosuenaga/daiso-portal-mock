import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    announcement: {
      findMany: vi.fn(),
    },
    announcementNotificationLog: {
      findMany: vi.fn(),
    },
    applicantUser: {
      findMany: vi.fn(),
    },
    announcementRecipientStatus: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server/announcement-service", () => ({
  getAnnouncementRecipientStatuses: vi.fn(),
}));

vi.mock("@/lib/server/announcement-notifications", () => ({
  notifyAnnouncementEscalation: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { getAnnouncementRecipientStatuses } from "@/lib/server/announcement-service";
import { notifyAnnouncementEscalation } from "@/lib/server/announcement-notifications";
import { runAnnouncementAutoEscalation } from "@/lib/server/announcement-escalation";

const NOW = new Date("2026-07-24T03:00:00.000Z"); // JST 2026-07-24 12:00

function announcementRecord(
  overrides: Partial<{
    id: string;
    status: "draft" | "published";
    actionRequired: boolean;
    dueDate: Date | null;
    targetingScope: "all" | "countries";
    targetingCountries: string[];
  }> = {}
) {
  return {
    id: "announcement-1",
    title: "タイトル",
    body: "本文",
    category: "other" as const,
    status: "published" as const,
    publishedAt: new Date("2026-07-01T00:00:00.000Z"),
    actionRequired: true,
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    publishStartDate: null,
    publishEndDate: null,
    dueDate: new Date("2026-07-20T00:00:00.000Z"),
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    attachments: [],
    linkedDocuments: [],
    translations: [],
    ...overrides,
  };
}

function recipientStatus(
  overrides: Partial<{
    recipientId: string;
    companyCode: string;
    completedAt: string | null;
  }> = {}
) {
  return {
    recipientId: "recipient-1",
    companyCode: "vn-daiso-vietnam",
    companyName: "Daiso Vietnam",
    country: "VN",
    contactName: "Nguyen",
    confirmedAt: null,
    completedAt: null,
    reminderSentAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.announcementNotificationLog.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
    { email: "a@example.com", company: { companyCode: "vn-daiso-vietnam" } },
  ] as never);
  vi.mocked(prisma.announcementRecipientStatus.upsert).mockResolvedValue({} as never);
  vi.mocked(notifyAnnouncementEscalation).mockResolvedValue(undefined);
});

describe("runAnnouncementAutoEscalation", () => {
  it("actionRequiredが偽・draft・dueDate未設定・期限内のいずれもクエリ条件またはフィルタで対象外になる", async () => {
    // status/actionRequired/dueDateの絞り込みはprisma.announcement.findManyのwhere句で
    // 行われるため、対象外の条件に一致するレコードはそもそも返されない想定でモックする。
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([] as never);

    const result = await runAnnouncementAutoEscalation(NOW);

    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "published", actionRequired: true, dueDate: { not: null } },
      })
    );
    expect(result.overdueAnnouncements).toBe(0);
    expect(getAnnouncementRecipientStatuses).not.toHaveBeenCalled();
  });

  it("期限内（dueDateが未来）のお知らせは対象から除外される", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      announcementRecord({ dueDate: new Date("2099-01-01T00:00:00.000Z") }),
    ] as never);

    const result = await runAnnouncementAutoEscalation(NOW);

    expect(result.overdueAnnouncements).toBe(0);
    expect(getAnnouncementRecipientStatuses).not.toHaveBeenCalled();
  });

  it("期限超過・公開・actionRequired真でcompletedAtがnullの会社にのみ送信し、完了済み会社は送らない", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcementRecord()] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockResolvedValue([
      recipientStatus({ recipientId: "r-1", companyCode: "vn-daiso-vietnam", completedAt: null }),
      recipientStatus({ recipientId: "r-2", companyCode: "th-daiso-thailand", completedAt: "2026-07-10T00:00:00.000Z" }),
    ] as never);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      { email: "a@example.com", company: { companyCode: "vn-daiso-vietnam" } },
    ] as never);

    const result = await runAnnouncementAutoEscalation(NOW);

    expect(result.overdueAnnouncements).toBe(1);
    expect(notifyAnnouncementEscalation).toHaveBeenCalledWith(
      "announcement-1",
      ["vn-daiso-vietnam"],
      new Set()
    );
    expect(prisma.applicantUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ isActive: true }, { company: { companyCode: { in: ["vn-daiso-vietnam"] } } }],
        },
      })
    );
    expect(result.notifiedRecipients).toBe(1);
    expect(result.skippedByDedup).toBe(0);
    expect(prisma.announcementRecipientStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { announcementId_recipientId: { announcementId: "announcement-1", recipientId: "r-1" } },
        update: { reminderSentAt: NOW },
      })
    );
    // 完了済み会社（th-daiso-thailand）のrecipientId r-2についてはupsertされない
    expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { announcementId_recipientId: { announcementId: "announcement-1", recipientId: "r-2" } },
      })
    );
  });

  it("当日escalationログのある宛先はスキップされ、reminderSentAtも更新されない", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcementRecord()] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockResolvedValue([
      recipientStatus({ recipientId: "r-1", companyCode: "vn-daiso-vietnam", completedAt: null }),
    ] as never);
    vi.mocked(prisma.announcementNotificationLog.findMany).mockResolvedValue([
      { recipientEmail: "a@example.com" },
    ] as never);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      { email: "a@example.com", company: { companyCode: "vn-daiso-vietnam" } },
    ] as never);

    const result = await runAnnouncementAutoEscalation(NOW);

    expect(notifyAnnouncementEscalation).toHaveBeenCalledWith(
      "announcement-1",
      ["vn-daiso-vietnam"],
      new Set(["a@example.com"])
    );
    expect(result.notifiedRecipients).toBe(0);
    expect(result.skippedByDedup).toBe(1);
    expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalled();
  });

  it("当日重複ログの照会はescalation・reminderの両方のkindを対象に、announcementId・当日開始以降で絞り込む", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcementRecord()] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockResolvedValue([
      recipientStatus({ recipientId: "r-1", companyCode: "vn-daiso-vietnam", completedAt: null }),
    ] as never);

    await runAnnouncementAutoEscalation(NOW);

    expect(prisma.announcementNotificationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          announcementId: "announcement-1",
          kind: { in: ["escalation", "reminder"] },
          sentAt: { gte: new Date(2026, 6, 24, 0, 0, 0, 0) },
        }),
      })
    );
  });

  it("連続2回呼び出すと2回目は当日重複によりnotifyAnnouncementEscalationへ渡すalreadyNotifiedEmailsが増え、追加送信対象が生じない", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcementRecord()] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockResolvedValue([
      recipientStatus({ recipientId: "r-1", companyCode: "vn-daiso-vietnam", completedAt: null }),
    ] as never);
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      { email: "a@example.com", company: { companyCode: "vn-daiso-vietnam" } },
    ] as never);

    // 1回目: 当日ログなし → 送信対象1件
    vi.mocked(prisma.announcementNotificationLog.findMany).mockResolvedValueOnce([] as never);
    const first = await runAnnouncementAutoEscalation(NOW);
    expect(first.notifiedRecipients).toBe(1);

    // 2回目: 1回目の送信結果が当日ログとして既に存在する状態を模擬 → 追加送信されない
    vi.mocked(prisma.announcementNotificationLog.findMany).mockResolvedValueOnce([
      { recipientEmail: "a@example.com" },
    ] as never);
    const second = await runAnnouncementAutoEscalation(NOW);
    expect(second.notifiedRecipients).toBe(0);
    expect(second.skippedByDedup).toBe(1);
  });

  it("お知らせ取得自体が例外を投げても、throwせず結果を返す（ベストエフォート）", async () => {
    vi.mocked(prisma.announcement.findMany).mockRejectedValue(new Error("DB down"));

    await expect(runAnnouncementAutoEscalation(NOW)).resolves.toEqual({
      overdueAnnouncements: 0,
      notifiedRecipients: 0,
      skippedByDedup: 0,
    });
  });

  it("個別のお知らせ処理中の例外は捕捉し、他のお知らせの処理を継続する", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      announcementRecord({ id: "announcement-1" }),
      announcementRecord({ id: "announcement-2" }),
    ] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockImplementation(async (id: string) => {
      if (id === "announcement-1") {
        throw new Error("boom");
      }
      return [
        recipientStatus({ recipientId: "r-2", companyCode: "vn-daiso-vietnam", completedAt: null }),
      ] as never;
    });

    await expect(runAnnouncementAutoEscalation(NOW)).resolves.toEqual(
      expect.objectContaining({ overdueAnnouncements: 2, notifiedRecipients: 1 })
    );
  });
});
