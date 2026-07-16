import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    announcement: {
      findUnique: vi.fn(),
    },
    applicantUser: {
      findMany: vi.fn(),
    },
    announcementNotificationLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server/mailer", () => ({
  MailerNotConfiguredError: class MailerNotConfiguredError extends Error {},
  sendMail: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { MailerNotConfiguredError, sendMail } from "@/lib/server/mailer";
import {
  notifyAnnouncementPublished,
  notifyAnnouncementReminder,
} from "@/lib/server/announcement-notifications";

function announcementRecord(
  overrides: Partial<{
    id: string;
    title: string;
    body: string;
    targetingScope: "all" | "countries";
    targetingCountries: string[];
    dueDate: Date | null;
    translations: { id: string; announcementId: string; locale: string; title: string; body: string }[];
  }> = {}
) {
  return {
    id: "announcement-1",
    title: "タイトル",
    body: "本文",
    category: "other" as const,
    status: "published" as const,
    publishedAt: new Date("2026-07-01T00:00:00.000Z"),
    actionRequired: false,
    targetingScope: "all" as const,
    targetingCountries: [] as string[],
    publishStartDate: null,
    publishEndDate: null,
    dueDate: null,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    attachments: [],
    linkedDocuments: [],
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notifyAnnouncementPublished", () => {
  it("配信対象国に属するApplicantUser全員へ送信し、成功をsentとして記録する", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      announcementRecord() as never
    );
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      { email: "a@example.com", preferredLocale: "ja" },
      { email: "b@example.com", preferredLocale: "en" },
    ] as never);
    vi.mocked(sendMail).mockResolvedValue(undefined);

    await notifyAnnouncementPublished("announcement-1");

    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(prisma.announcementNotificationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        announcementId: "announcement-1",
        kind: "publish",
        recipientEmail: "a@example.com",
        locale: "ja",
        status: "sent",
      }),
    });
  });

  it("配信対象が特定国のとき、対象国のApplicantUserのみに絞り込む", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      announcementRecord({ targetingScope: "countries", targetingCountries: ["VN"] }) as never
    );
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([] as never);

    await notifyAnnouncementPublished("announcement-1");

    expect(prisma.applicantUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { company: { country: { in: ["VN"] } } },
      })
    );
  });

  it("SMTP未設定（MailerNotConfiguredError）の場合はskippedとして記録し、例外を伝播させない", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      announcementRecord() as never
    );
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      { email: "a@example.com", preferredLocale: "ja" },
    ] as never);
    vi.mocked(sendMail).mockRejectedValue(new MailerNotConfiguredError());

    await expect(notifyAnnouncementPublished("announcement-1")).resolves.toBeUndefined();

    expect(prisma.announcementNotificationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "skipped", errorMessage: null }),
    });
  });

  it("送信失敗時はfailedとして記録し、例外を伝播させない", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      announcementRecord() as never
    );
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      { email: "a@example.com", preferredLocale: "ja" },
    ] as never);
    vi.mocked(sendMail).mockRejectedValue(new Error("SMTP timeout"));

    await expect(notifyAnnouncementPublished("announcement-1")).resolves.toBeUndefined();

    expect(prisma.announcementNotificationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "failed", errorMessage: "SMTP timeout" }),
    });
  });

  it("宛先の言語設定に対応する翻訳が存在する場合はその内容で送信する", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      announcementRecord({
        translations: [
          { id: "t1", announcementId: "announcement-1", locale: "en", title: "Title EN", body: "Body EN" },
        ],
      }) as never
    );
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      { email: "b@example.com", preferredLocale: "en" },
    ] as never);
    vi.mocked(sendMail).mockResolvedValue(undefined);

    await notifyAnnouncementPublished("announcement-1");

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "b@example.com", subject: "Title EN" })
    );
  });

  it("宛先の言語設定に対応する翻訳が存在しない場合は既定言語（ja）にフォールバックする", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      announcementRecord() as never
    );
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      { email: "c@example.com", preferredLocale: "th" },
    ] as never);
    vi.mocked(sendMail).mockResolvedValue(undefined);

    await notifyAnnouncementPublished("announcement-1");

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "c@example.com", subject: "タイトル" })
    );
  });

  it("メール本文の詳細リンクはスキーム・ホストを含む絶対URLで、宛先のpreferredLocaleに対応するUIロケール（ja/en）のパスにする", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      announcementRecord() as never
    );
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      { email: "a@example.com", preferredLocale: "ja" },
      { email: "b@example.com", preferredLocale: "en" },
      { email: "c@example.com", preferredLocale: "th" },
    ] as never);
    vi.mocked(sendMail).mockResolvedValue(undefined);

    await notifyAnnouncementPublished("announcement-1");

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@example.com",
        text: expect.stringContaining("http://localhost:3000/ja/announcements/announcement-1"),
      })
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "b@example.com",
        text: expect.stringContaining("http://localhost:3000/en/announcements/announcement-1"),
      })
    );
    // "th"はUIルーティング上のロケールではないため、既定ロケール（ja）のパスにフォールバックする
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "c@example.com",
        text: expect.stringContaining("http://localhost:3000/ja/announcements/announcement-1"),
      })
    );
  });

  it("AUTH_URLが設定されている場合はそれをベースURLとして詳細リンクに使う（末尾スラッシュは除去する）", async () => {
    vi.stubEnv("AUTH_URL", "https://portal-mock.example.run.app/");
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      announcementRecord() as never
    );
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      { email: "a@example.com", preferredLocale: "ja" },
    ] as never);
    vi.mocked(sendMail).mockResolvedValue(undefined);

    await notifyAnnouncementPublished("announcement-1");

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(
          "https://portal-mock.example.run.app/ja/announcements/announcement-1"
        ),
      })
    );
    vi.unstubAllEnvs();
  });

  it("存在しないお知らせIDに対しては何もしない", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(null);

    await notifyAnnouncementPublished("missing");

    expect(prisma.applicantUser.findMany).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("notifyAnnouncementReminder", () => {
  it("指定した会社コードに属するApplicantUserのみへ送信する", async () => {
    vi.mocked(prisma.announcement.findUnique).mockResolvedValue(
      announcementRecord() as never
    );
    vi.mocked(prisma.applicantUser.findMany).mockResolvedValue([
      { email: "a@example.com", preferredLocale: "ja" },
    ] as never);
    vi.mocked(sendMail).mockResolvedValue(undefined);

    await notifyAnnouncementReminder("announcement-1", ["vn-daiso-vietnam"]);

    expect(prisma.applicantUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{}, { company: { companyCode: { in: ["vn-daiso-vietnam"] } } }],
        },
      })
    );
    expect(prisma.announcementNotificationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ kind: "reminder" }),
    });
  });

  it("空の会社コード配列を渡した場合は何もしない", async () => {
    await notifyAnnouncementReminder("announcement-1", []);

    expect(prisma.announcement.findUnique).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
