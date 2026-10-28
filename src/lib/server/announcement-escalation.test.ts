import { describe, expect, it, vi, beforeEach } from "vitest";

const lockState = vi.hoisted(() => ({ locked: true }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ $queryRaw: vi.fn(async () => [{ locked: lockState.locked }]) })
    ),
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
import { logger } from "@/lib/server/logger";
import { ANNOUNCEMENT_LIST_INCLUDE } from "@/lib/server/announcement-mapper";

const NOW = new Date("2026-07-24T03:00:00.000Z"); // JST 2026-07-24 12:00

function announcementRecord(
  overrides: Partial<{
    id: string;
    status: "draft" | "published";
    actionRequired: boolean;
    dueDate: Date | null;
    targetingScope: "all" | "countries";
    targetingCountries: string[];
    publishStartDate: Date | null;
    publishEndDate: Date | null;
    publishStartTime: string | null;
    publishEndTime: string | null;
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
    publishStartTime: null,
    publishEndTime: null,
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
    completedAt: null,
    reminderSentAt: null,
    ...overrides,
  };
}

const SENT = (emails: string[]) => ({ sentEmails: emails, skipped: 0, failed: 0 });

beforeEach(() => {
  vi.clearAllMocks();
  lockState.locked = true;
  vi.mocked(prisma.announcementNotificationLog.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
    { email: "a@example.com", company: { companyCode: "vn-daiso-vietnam" } },
  ] as never);
  vi.mocked(prisma.announcementRecipientStatus.upsert).mockResolvedValue({} as never);
  vi.mocked(notifyAnnouncementEscalation).mockResolvedValue(SENT(["a@example.com"]));
});

describe("runAnnouncementAutoEscalation", () => {
  it("お知らせ取得は添付本体（dataUrl）を読み込まない一覧用includeで行う", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([] as never);

    await runAnnouncementAutoEscalation(NOW);

    const args = vi.mocked(prisma.announcement.findMany).mock.calls[0][0] as {
      include: typeof ANNOUNCEMENT_LIST_INCLUDE;
    };
    expect(args.include).toEqual(ANNOUNCEMENT_LIST_INCLUDE);
    expect(args.include.attachments).toEqual({
      select: { id: true, fileName: true, fileType: true, fileSize: true },
    });
    expect(JSON.stringify(args.include)).not.toContain("dataUrl");
  });

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

  it("公開終了日を過ぎたお知らせは対象外（件数にも含めず、送信しない）", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      announcementRecord({ publishEndDate: new Date("2026-07-22") }),
    ] as never);

    const result = await runAnnouncementAutoEscalation(NOW);

    expect(result.overdueAnnouncements).toBe(0);
    expect(getAnnouncementRecipientStatuses).not.toHaveBeenCalled();
    expect(notifyAnnouncementEscalation).not.toHaveBeenCalled();
  });

  it("公開開始日がまだ来ていないお知らせは対象外", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      announcementRecord({ publishStartDate: new Date("2026-07-25") }),
    ] as never);

    const result = await runAnnouncementAutoEscalation(NOW);

    expect(result.overdueAnnouncements).toBe(0);
    expect(getAnnouncementRecipientStatuses).not.toHaveBeenCalled();
    expect(notifyAnnouncementEscalation).not.toHaveBeenCalled();
  });

  it("公開期間内（07-01〜07-31）なら従来どおり送信する", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      announcementRecord({
        publishStartDate: new Date("2026-07-01"),
        publishEndDate: new Date("2026-07-31"),
      }),
    ] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockResolvedValue([
      recipientStatus({ recipientId: "r-1", completedAt: null }),
    ] as never);

    const result = await runAnnouncementAutoEscalation(NOW);

    expect(result.overdueAnnouncements).toBe(1);
    expect(notifyAnnouncementEscalation).toHaveBeenCalled();
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
      new Set(),
      expect.objectContaining({ deadlineAt: expect.any(Number) })
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
      new Set(["a@example.com"]),
      expect.objectContaining({ deadlineAt: expect.any(Number) })
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
          status: "sent",
          // JST 2026-07-24 0:00 = UTC 2026-07-23T15:00
          sentAt: { gte: new Date("2026-07-23T15:00:00.000Z") },
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

  it("当日ログに個人単位の既読リマインド（kind: read_reminder）が存在しても、当日重複とはみなさず通常どおり督促を送信する（要件42.1, 42.2, 42.3）", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcementRecord()] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockResolvedValue([
      recipientStatus({ recipientId: "r-1", companyCode: "vn-daiso-vietnam", completedAt: null }),
    ] as never);
    // 当日重複判定のログ照会はkind: {in: ["escalation", "reminder"]}に限定されるため、
    // 同一宛先に対しread_reminder（個人単位の既読リマインド）が当日送信済みであっても
    // このクエリでは返らない（本モックはkind条件でフィルタした結果を模して常に空配列を返す）。
    vi.mocked(prisma.announcementNotificationLog.findMany).mockImplementation(
      (async (args?: { where: { kind: { in: string[] } } }) => {
        const kindIn = args?.where.kind.in ?? [];
        expect(kindIn).toEqual(["escalation", "reminder"]);
        expect(kindIn).not.toContain("read_reminder");
        return [];
      }) as never
    );

    const result = await runAnnouncementAutoEscalation(NOW);

    expect(result.notifiedRecipients).toBe(1);
    expect(result.skippedByDedup).toBe(0);
  });

  it("お知らせ取得自体が例外（DB接続不可等）を投げた場合はthrowする（cronルートが500に変換）", async () => {
    vi.mocked(prisma.announcement.findMany).mockRejectedValue(new Error("DB down"));

    await expect(runAnnouncementAutoEscalation(NOW)).rejects.toThrow("DB down");
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
      expect.objectContaining({
        overdueAnnouncements: 2,
        notifiedRecipients: 1,
        failedAnnouncements: 1,
      })
    );
  });

  it("エラーログはerrorFieldsで全情報を出し、宛先メールはfieldsのキーに入れない", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcementRecord()] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockRejectedValue(
      new Error("failed for secret-user@example.com")
    );
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    await runAnnouncementAutoEscalation(NOW);

    const [, fields] = errorSpy.mock.calls[0] as [string, Record<string, unknown>];
    expect(fields.announcementId).toBeDefined();
    expect(fields.errorMessage).toContain("failed for");
    expect(fields).not.toHaveProperty("email");
    expect(fields).not.toHaveProperty("recipientEmail");
    errorSpy.mockRestore();
  });

  describe("reminderSentAtの打刻（誤表示防止）", () => {
    beforeEach(() => {
      vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcementRecord()] as never);
      vi.mocked(getAnnouncementRecipientStatuses).mockResolvedValue([
        recipientStatus({ recipientId: "r-1", companyCode: "vn-daiso-vietnam", completedAt: null }),
      ] as never);
    });

    it("SMTP未設定（skipped）のときは打刻せず、skippedRecipientsに集計する", async () => {
      vi.mocked(notifyAnnouncementEscalation).mockResolvedValue({
        sentEmails: [],
        skipped: 1,
        failed: 0,
      });

      const result = await runAnnouncementAutoEscalation(NOW);

      expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalled();
      expect(result.skippedRecipients).toBe(1);
      expect(result.sentRecipients).toBe(0);
    });

    it("送信失敗（failed）のときは打刻せず、failedRecipientsに集計する", async () => {
      vi.mocked(notifyAnnouncementEscalation).mockResolvedValue({
        sentEmails: [],
        skipped: 0,
        failed: 1,
      });

      const result = await runAnnouncementAutoEscalation(NOW);

      expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalled();
      expect(result.failedRecipients).toBe(1);
    });

    it("会社内に1件でも送信成功があれば打刻する", async () => {
      vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
        { email: "a@example.com", company: { companyCode: "vn-daiso-vietnam" } },
        { email: "b@example.com", company: { companyCode: "vn-daiso-vietnam" } },
      ] as never);
      vi.mocked(notifyAnnouncementEscalation).mockResolvedValue({
        sentEmails: ["b@example.com"],
        skipped: 0,
        failed: 1,
      });

      const result = await runAnnouncementAutoEscalation(NOW);

      expect(prisma.announcementRecipientStatus.upsert).toHaveBeenCalledTimes(1);
      expect(result.sentRecipients).toBe(1);
      expect(result.failedRecipients).toBe(1);
    });
  });

  it("advisory lockを取得できない場合は何も処理せずskippedByLockを返す", async () => {
    lockState.locked = false;

    const result = await runAnnouncementAutoEscalation(NOW);

    expect(result.skippedByLock).toBe(true);
    expect(prisma.announcement.findMany).not.toHaveBeenCalled();
    expect(notifyAnnouncementEscalation).not.toHaveBeenCalled();
  });

  it("締切到達後は新規のお知らせの処理（送信）を始めず、abortedByDeadlineを返す", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([
      announcementRecord({ id: "announcement-1" }),
      announcementRecord({ id: "announcement-2" }),
      announcementRecord({ id: "announcement-3" }),
    ] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockResolvedValue([
      recipientStatus({ recipientId: "r-1", companyCode: "vn-daiso-vietnam", completedAt: null }),
    ] as never);
    // 1件目の送信中に時間が締切（1000ms）を超える状況を模擬する。
    let nowMs = 1_000_000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);
    vi.mocked(notifyAnnouncementEscalation).mockImplementation((async () => {
      nowMs += 1_500;
      return SENT(["a@example.com"]);
    }) as never);

    try {
      const result = await runAnnouncementAutoEscalation(NOW, { deadlineMs: 1_000 });

      expect(result.abortedByDeadline).toBe(true);
      expect(notifyAnnouncementEscalation).toHaveBeenCalledTimes(1);
      expect(getAnnouncementRecipientStatuses).toHaveBeenCalledTimes(1);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("処理途中（送信直前）で締切を超えたら、送信も打刻もしない", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcementRecord()] as never);
    // 受信者状態の取得中に時間が締切を超える状況を模擬する（ループ先頭の確認は通過済み）。
    let nowMs = 1_000_000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);
    vi.mocked(getAnnouncementRecipientStatuses).mockImplementation((async () => {
      nowMs += 2_000;
      return [
        recipientStatus({ recipientId: "r-1", companyCode: "vn-daiso-vietnam", completedAt: null }),
      ];
    }) as never);

    try {
      const result = await runAnnouncementAutoEscalation(NOW, { deadlineMs: 1_000 });

      expect(result.abortedByDeadline).toBe(true);
      expect(notifyAnnouncementEscalation).not.toHaveBeenCalled();
      expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalled();
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("送信ループが締切で打ち切られた場合（deadlineReached）もabortedByDeadlineを返し、送信済み分は打刻する", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcementRecord()] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockResolvedValue([
      recipientStatus({ recipientId: "r-1", companyCode: "vn-daiso-vietnam", completedAt: null }),
    ] as never);
    vi.mocked(notifyAnnouncementEscalation).mockResolvedValue({
      ...SENT(["a@example.com"]),
      deadlineReached: true,
    });

    const result = await runAnnouncementAutoEscalation(NOW);

    expect(result.abortedByDeadline).toBe(true);
    expect(prisma.announcementRecipientStatus.upsert).toHaveBeenCalledTimes(1);
  });

  it("deadlineMsの注入値は導出した上限（トランザクション上限−余裕）で丸められる", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcementRecord()] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockResolvedValue([
      recipientStatus({ recipientId: "r-1", companyCode: "vn-daiso-vietnam", completedAt: null }),
    ] as never);
    const base = 5_000_000;
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(base);

    try {
      await runAnnouncementAutoEscalation(NOW, { deadlineMs: 10_000_000 });

      const options = vi.mocked(notifyAnnouncementEscalation).mock.calls[0][3];
      expect(options?.deadlineAt).toBe(base + 240_000);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("締切内で完了した場合はabortedByDeadlineはfalse", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcementRecord()] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockResolvedValue([
      recipientStatus({ recipientId: "r-1", companyCode: "vn-daiso-vietnam", completedAt: null }),
    ] as never);

    const result = await runAnnouncementAutoEscalation(NOW);

    expect(result.abortedByDeadline).toBe(false);
  });

  it("エラーログにPrismaのエラーコードを含める（メッセージは含めない）", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcementRecord()] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockRejectedValue(
      Object.assign(new Error("secret-user@example.com"), { name: "PrismaClientKnownRequestError", code: "P2024" })
    );
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    await runAnnouncementAutoEscalation(NOW);

    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain("P2024");
    errorSpy.mockRestore();
  });

  it("dryRunは送信・打刻・ロック取得をせず、対象件数のみ集計する", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([announcementRecord()] as never);
    vi.mocked(getAnnouncementRecipientStatuses).mockResolvedValue([
      recipientStatus({ recipientId: "r-1", companyCode: "vn-daiso-vietnam", completedAt: null }),
    ] as never);

    const result = await runAnnouncementAutoEscalation(NOW, { dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.overdueAnnouncements).toBe(1);
    expect(result.notifiedRecipients).toBe(1);
    expect(notifyAnnouncementEscalation).not.toHaveBeenCalled();
    expect(prisma.announcementRecipientStatus.upsert).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("JST固定: UTC実行でもJST 0:30（UTC前日15:30）に前日期限のお知らせが超過扱いになる", async () => {
    const originalTz = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      vi.mocked(prisma.announcement.findMany).mockResolvedValue([
        announcementRecord({ dueDate: new Date("2026-07-14T00:00:00.000Z") }),
      ] as never);
      vi.mocked(getAnnouncementRecipientStatuses).mockResolvedValue([] as never);

      const result = await runAnnouncementAutoEscalation(new Date("2026-07-14T15:30:00.000Z"));

      expect(result.overdueAnnouncements).toBe(1);
    } finally {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    }
  });
});
