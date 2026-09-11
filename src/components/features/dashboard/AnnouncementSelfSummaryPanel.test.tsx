import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnnouncementSelfSummaryPanel } from "@/components/features/dashboard/AnnouncementSelfSummaryPanel";
import type { Announcement } from "@/types/announcement";
import type { AnnouncementSelfStatus } from "@/types/announcement-recipient";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const getAnnouncementsMock = vi.fn();
const getAnnouncementSelfStatusesMock = vi.fn();

vi.mock("@/lib/api/announcements", () => ({
  getAnnouncements: (...args: unknown[]) => getAnnouncementsMock(...args),
}));

vi.mock("@/lib/api/announcement-tracking", () => ({
  getAnnouncementSelfStatuses: (...args: unknown[]) =>
    getAnnouncementSelfStatusesMock(...args),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
  getLocale: async () => "ja",
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

function makeAnnouncement(id: string, overrides: Partial<Announcement> = {}): Announcement {
  return {
    id,
    title: `お知らせ${id}`,
    status: "published",
    publishedAt: "2026-07-01T09:00:00Z",
    category: "other",
    body: "本文",
    targeting: { scope: "all" },
    actionRequired: false,
    sendEmailNotification: false,
    createdAt: "2026-07-01T09:00:00Z",
    updatedAt: "2026-07-01T09:00:00Z",
    attachments: [],
    linkedDocumentIds: [],
    translations: [],
    ...overrides,
  };
}

describe("AnnouncementSelfSummaryPanel", () => {
  afterEach(() => {
    getAnnouncementsMock.mockReset();
    getAnnouncementSelfStatusesMock.mockReset();
  });

  it("対応状況3区分・カテゴリ別内訳をグラフ（横棒リスト）で分けて表示する", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([
      makeAnnouncement("1", { actionRequired: true, category: "maintenance" }),
      makeAnnouncement("2", { actionRequired: true, category: "incident" }),
      makeAnnouncement("3", { actionRequired: false, category: "other" }),
    ]);
    const statuses = new Map<string, AnnouncementSelfStatus>([
      ["1", { confirmedAt: null, completedAt: null }],
      ["2", { confirmedAt: "2026-07-02T00:00:00Z", completedAt: null }],
      ["3", { confirmedAt: "2026-07-02T00:00:00Z", completedAt: null }],
    ]);
    getAnnouncementSelfStatusesMock.mockResolvedValueOnce(statuses);

    const jsx = await AnnouncementSelfSummaryPanel({ viewAllHref: "/announcements" });
    render(jsx);

    expect(
      screen.getByText("dashboard.announcementSummary.unconfirmedLabel")
    ).toBeTruthy();
    expect(
      screen.getByText("dashboard.announcementSummary.actionPendingLabel")
    ).toBeTruthy();
    expect(
      screen.getByText("dashboard.announcementSummary.confirmedCompleteLabel")
    ).toBeTruthy();
    expect(
      screen.getByText("dashboard.announcementSummary.categoryBreakdownTitle")
    ).toBeTruthy();
    expect(screen.getByText("announcements.categories.maintenance")).toBeTruthy();
    expect(screen.getByText("announcements.categories.incident")).toBeTruthy();
    expect(screen.getByText("announcements.categories.policy")).toBeTruthy();
    expect(screen.getByText("announcements.categories.other")).toBeTruthy();
    expect(
      screen.getByText("dashboard.announcementSummary.totalCaption")
    ).toBeTruthy();
  });

  it("対象のお知らせが0件の場合は空状態メッセージを表示する", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([]);
    getAnnouncementSelfStatusesMock.mockResolvedValueOnce(new Map());

    const jsx = await AnnouncementSelfSummaryPanel({ viewAllHref: "/announcements" });
    render(jsx);

    expect(
      screen.getByText("dashboard.announcementSummary.empty")
    ).toBeTruthy();
  });

  it("データ取得が失敗した場合はエラー状態を表示し、例外をスローしない", async () => {
    getAnnouncementsMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await AnnouncementSelfSummaryPanel({ viewAllHref: "/announcements" });
    render(jsx);

    expect(
      screen.getByText("dashboard.announcementSummary.error")
    ).toBeTruthy();
  });

  it("「一覧を見る」リンクがviewAllHrefを指す", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([makeAnnouncement("1")]);
    getAnnouncementSelfStatusesMock.mockResolvedValueOnce(new Map());

    const jsx = await AnnouncementSelfSummaryPanel({ viewAllHref: "/announcements" });
    render(jsx);

    const link = screen.getByRole("link", {
      name: "dashboard.announcementSummary.viewAll",
    });
    expect(link.getAttribute("href")).toBe("/announcements");
  });
});
