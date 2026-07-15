import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnnouncementList } from "@/components/features/announcements/AnnouncementList";
import type { Announcement } from "@/types/announcement";
import type { AnnouncementSelfStatus } from "@/types/announcement-recipient";
import messages from "../../../../messages/ja.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const getAnnouncementsMock = vi.fn();

vi.mock("@/lib/api/announcements", () => ({
  getAnnouncements: (...args: unknown[]) => getAnnouncementsMock(...args),
}));

const getAnnouncementSelfStatusMock = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_id: string): Promise<AnnouncementSelfStatus> => ({
    confirmedAt: null,
    completedAt: null,
  })
);

vi.mock("@/lib/api/announcement-tracking", () => ({
  isReminderPendingForCompany: async () => false,
  getAnnouncementSelfStatus: (id: string) => getAnnouncementSelfStatusMock(id),
}));

vi.mock("@/lib/server/auth-session", () => ({
  requireApplicantSession: async () => ({
    claims: {
      role: "applicant",
      applicantUserId: "applicant-1",
      companyId: "company-1",
      companyName: "Test Co.",
      companyCode: "test-co",
      country: "JP",
    },
  }),
}));

function resolveMessage(namespace: string, key: string): string {
  const segments = `${namespace}.${key}`.split(".");
  let value: unknown = messages;
  for (const segment of segments) {
    if (typeof value !== "object" || value === null) {
      return `${namespace}.${key}`;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return typeof value === "string" ? value : `${namespace}.${key}`;
}

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    (key: string) => resolveMessage(namespace, key),
  getLocale: async () => "ja",
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) =>
    (key: string) => resolveMessage(namespace, key),
}));

const ANNOUNCEMENT: Announcement = {
  id: "1",
  title: "テストお知らせ",
  status: "published",
  publishedAt: "2026-07-01T09:00:00Z",
  category: "maintenance",
  body: "本文テキスト",
  targeting: { scope: "all" },
  actionRequired: false,
  createdAt: "2026-07-01T09:00:00Z",
  updatedAt: "2026-07-01T09:00:00Z",
  attachments: [],
  linkedDocumentIds: [],
};

describe("AnnouncementList", () => {
  beforeEach(() => {
    getAnnouncementSelfStatusMock.mockClear();
  });

  it("お知らせが0件のとき空状態メッセージを表示する", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([]);

    const jsx = await AnnouncementList();
    render(jsx);

    expect(screen.getByText("お知らせはありません")).toBeTruthy();
  });

  it("getAnnouncementsが例外をthrowしたときエラーメッセージを表示する", async () => {
    getAnnouncementsMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await AnnouncementList();
    render(jsx);

    expect(screen.getByText("お知らせの取得に失敗しました")).toBeTruthy();
  });

  it("取得成功時にお知らせ一覧を表示する", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([ANNOUNCEMENT]);

    const jsx = await AnnouncementList();
    render(jsx);

    expect(screen.getByText("テストお知らせ")).toBeTruthy();
    expect(
      screen.queryByText("お知らせはありません")
    ).toBeNull();
    expect(
      screen.queryByText("お知らせの取得に失敗しました")
    ).toBeNull();
  });

  it("自社が確認済みのお知らせには確認済みバッジを表示する", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([ANNOUNCEMENT]);
    getAnnouncementSelfStatusMock.mockResolvedValueOnce({
      confirmedAt: "2026-07-01T00:00:00Z",
      completedAt: null,
    });

    const jsx = await AnnouncementList();
    render(jsx);

    expect(screen.getByText("確認済み")).toBeTruthy();
  });

  it("自社が未確認のお知らせには確認済みバッジを表示しない", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([ANNOUNCEMENT]);
    getAnnouncementSelfStatusMock.mockResolvedValueOnce({
      confirmedAt: null,
      completedAt: null,
    });

    const jsx = await AnnouncementList();
    render(jsx);

    expect(screen.queryByText("確認済み")).toBeNull();
  });

  it("一覧を表示するだけではconfirm系のアクションを呼び出さない（記録トリガーを持たない）", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([ANNOUNCEMENT]);

    const jsx = await AnnouncementList();
    render(jsx);

    // getAnnouncementSelfStatus（読み取り専用）のみ呼ばれ、記録アクションへの依存は一切ない
    expect(getAnnouncementSelfStatusMock).toHaveBeenCalledWith(ANNOUNCEMENT.id);
  });
});
