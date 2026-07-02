import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnnouncementWidget } from "@/components/features/dashboard/AnnouncementWidget";
import type { Announcement } from "@/types/announcement";
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

const getRecentAnnouncementsMock = vi.fn();

vi.mock("@/lib/api/announcements", () => ({
  getRecentAnnouncements: (...args: unknown[]) =>
    getRecentAnnouncementsMock(...args),
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

const ANNOUNCEMENT: Announcement = {
  id: "1",
  title: "テストお知らせ",
  publishedAt: "2026-07-01T09:00:00Z",
  category: "maintenance",
  body: "本文テキスト",
};

describe("AnnouncementWidget", () => {
  it("表示件数の上限として5件を要求する", async () => {
    getRecentAnnouncementsMock.mockResolvedValueOnce([ANNOUNCEMENT]);

    const jsx = await AnnouncementWidget();
    render(jsx);

    expect(getRecentAnnouncementsMock).toHaveBeenCalledWith({ limit: 5 });
  });

  it("各項目にカテゴリバッジと詳細ページへのリンクを表示する", async () => {
    getRecentAnnouncementsMock.mockResolvedValueOnce([ANNOUNCEMENT]);

    const jsx = await AnnouncementWidget();
    render(jsx);

    expect(screen.getByText("メンテナンス")).toBeTruthy();
    const titleLink = screen.getByRole("link", { name: "テストお知らせ" });
    expect(titleLink.getAttribute("href")).toBe("/announcements/1");
  });

  it("お知らせ一覧ページへの遷移リンクを表示する", async () => {
    getRecentAnnouncementsMock.mockResolvedValueOnce([ANNOUNCEMENT]);

    const jsx = await AnnouncementWidget();
    render(jsx);

    const viewAllLink = screen.getByRole("link", {
      name: messages.dashboard.announcements.viewAll,
    });
    expect(viewAllLink.getAttribute("href")).toBe("/announcements");
  });
});
