import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnnouncementsPreviewPanel } from "@/components/features/dashboard/AnnouncementsPreviewPanel";
import type { Announcement } from "@/types/announcement";

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

const getRecentAnnouncementsMock = vi.fn();

vi.mock("@/lib/api/announcements", () => ({
  getRecentAnnouncements: (...args: unknown[]) =>
    getRecentAnnouncementsMock(...args),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
  getLocale: async () => "ja",
}));

function makeAnnouncement(
  id: string,
  title: string,
  publishedAt: string,
  overrides: Partial<Announcement> = {}
): Announcement {
  return {
    id,
    title,
    publishedAt,
    category: "other",
    body: "本文",
    targeting: { scope: "all" },
    actionRequired: false,
    ...overrides,
  };
}

describe("AnnouncementsPreviewPanel", () => {
  afterEach(() => {
    getRecentAnnouncementsMock.mockReset();
  });

  it("複数件のお知らせを一覧表示する", async () => {
    getRecentAnnouncementsMock.mockResolvedValueOnce([
      makeAnnouncement("1", "お知らせ1", "2026-07-01T09:00:00Z"),
      makeAnnouncement("2", "お知らせ2", "2026-06-28T09:00:00Z"),
      makeAnnouncement("3", "お知らせ3", "2026-06-20T09:00:00Z"),
    ]);

    const jsx = await AnnouncementsPreviewPanel({
      viewAllHref: "/announcements",
    });
    render(jsx);

    expect(getRecentAnnouncementsMock).toHaveBeenCalledWith({ limit: 5 });
    expect(screen.getByText("お知らせ1")).toBeTruthy();
    expect(screen.getByText("お知らせ2")).toBeTruthy();
    expect(screen.getByText("お知らせ3")).toBeTruthy();
  });

  it("各お知らせの本文要約・対応要否バッジ・対応期限を表示する", async () => {
    getRecentAnnouncementsMock.mockResolvedValueOnce([
      makeAnnouncement("1", "お知らせ1", "2026-07-01T09:00:00Z", {
        body: "本文の要約テキスト",
        actionRequired: true,
        dueDate: "2026-07-14",
      }),
    ]);

    const jsx = await AnnouncementsPreviewPanel({
      viewAllHref: "/announcements",
    });
    render(jsx);

    expect(screen.getByText("本文の要約テキスト")).toBeTruthy();
    expect(screen.getByText("announcements.actionRequiredBadge")).toBeTruthy();
    expect(screen.getByText(/announcements.dueDateLabel/)).toBeTruthy();
  });

  it("お知らせが0件の場合は空状態メッセージを表示する", async () => {
    getRecentAnnouncementsMock.mockResolvedValueOnce([]);

    const jsx = await AnnouncementsPreviewPanel({
      viewAllHref: "/announcements",
    });
    render(jsx);

    expect(
      screen.getByText("dashboard.announcementsPreview.empty")
    ).toBeTruthy();
  });

  it("データ取得が失敗した場合はエラー状態を表示し、例外をスローしない", async () => {
    getRecentAnnouncementsMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await AnnouncementsPreviewPanel({
      viewAllHref: "/announcements",
    });
    render(jsx);

    expect(
      screen.getByText("dashboard.announcementsPreview.error")
    ).toBeTruthy();
  });

  it("「一覧を見る」リンクがviewAllHrefを指す", async () => {
    getRecentAnnouncementsMock.mockResolvedValueOnce([
      makeAnnouncement("1", "お知らせ1", "2026-07-01T09:00:00Z"),
    ]);

    const jsx = await AnnouncementsPreviewPanel({
      viewAllHref: "/announcements",
    });
    render(jsx);

    const link = screen.getByRole("link", {
      name: "dashboard.announcementsPreview.viewAll",
    });
    expect(link.getAttribute("href")).toBe("/announcements");
  });
});
