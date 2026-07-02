import { render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { AnnouncementsCard } from "@/components/features/dashboard/AnnouncementsCard";
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

const getAnnouncementsMock = vi.fn();

vi.mock("@/lib/api/announcements", () => ({
  getAnnouncements: (...args: unknown[]) => getAnnouncementsMock(...args),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

function makeAnnouncement(
  id: string,
  publishedAt: string
): Announcement {
  return {
    id,
    title: `お知らせ${id}`,
    publishedAt,
    category: "other",
    body: "本文",
  };
}

const NOW = "2026-07-10T00:00:00.000Z";

describe("AnnouncementsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
    getAnnouncementsMock.mockReset();
  });

  it("直近7日以内に公開されたお知らせの件数をバッジとして表示する", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([
      makeAnnouncement("1", "2026-07-09T00:00:00.000Z"), // 1日前
      makeAnnouncement("2", "2026-07-05T00:00:00.000Z"), // 5日前
      makeAnnouncement("3", "2026-06-01T00:00:00.000Z"), // 対象外
    ]);

    const jsx = await AnnouncementsCard({
      href: "/announcements",
      titleKey: "dashboard.announcements.title",
      descriptionKey: "dashboard.announcements.description",
    });
    render(jsx);

    const badge = screen.getByText("2");
    expect(badge).toBeTruthy();
  });

  it("ちょうど7日前に公開されたお知らせは新着件数に含める（境界値）", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([
      makeAnnouncement("1", "2026-07-03T00:00:00.000Z"), // ちょうど7日前
    ]);

    const jsx = await AnnouncementsCard({
      href: "/announcements",
      titleKey: "dashboard.announcements.title",
      descriptionKey: "dashboard.announcements.description",
    });
    render(jsx);

    expect(screen.getByText("1")).toBeTruthy();
  });

  it("7日を1秒でも超えて公開されたお知らせのみの場合はバッジを表示しない（境界値）", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([
      makeAnnouncement("1", "2026-07-02T23:59:59.000Z"), // 7日+1秒前
    ]);

    const jsx = await AnnouncementsCard({
      href: "/announcements",
      titleKey: "dashboard.announcements.title",
      descriptionKey: "dashboard.announcements.description",
    });
    render(jsx);

    expect(screen.queryByText("1")).toBeNull();
  });

  it("8日前に公開されたお知らせのみの場合はバッジを表示しない", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([
      makeAnnouncement("1", "2026-07-02T00:00:00.000Z"), // 8日前
    ]);

    const jsx = await AnnouncementsCard({
      href: "/announcements",
      titleKey: "dashboard.announcements.title",
      descriptionKey: "dashboard.announcements.description",
    });
    render(jsx);

    expect(screen.queryByText("1")).toBeNull();
  });

  it("新着0件の場合はバッジを表示しない", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([]);

    const jsx = await AnnouncementsCard({
      href: "/announcements",
      titleKey: "dashboard.announcements.title",
      descriptionKey: "dashboard.announcements.description",
    });
    render(jsx);

    expect(screen.queryByRole("status")).toBeNull();
    expect(
      screen.getByRole("link", { name: /dashboard\.announcements\.title/ })
    ).toBeTruthy();
  });

  it("データ取得が失敗した場合は例外をスローせずバッジなしで表示する", async () => {
    getAnnouncementsMock.mockRejectedValueOnce(new Error("fetch failed"));

    const jsx = await AnnouncementsCard({
      href: "/announcements",
      titleKey: "dashboard.announcements.title",
      descriptionKey: "dashboard.announcements.description",
    });
    render(jsx);

    expect(
      screen.getByRole("link", { name: /dashboard\.announcements\.title/ })
    ).toBeTruthy();
  });

  it("recentDaysを指定した場合はその日数を基準に集計する", async () => {
    getAnnouncementsMock.mockResolvedValueOnce([
      makeAnnouncement("1", "2026-07-08T00:00:00.000Z"), // 2日前
      makeAnnouncement("2", "2026-06-20T00:00:00.000Z"), // 20日前
    ]);

    const jsx = await AnnouncementsCard({
      href: "/announcements",
      titleKey: "dashboard.announcements.title",
      descriptionKey: "dashboard.announcements.description",
      recentDays: 3,
    });
    render(jsx);

    expect(screen.getByText("1")).toBeTruthy();
  });
});
