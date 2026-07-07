import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnnouncementList } from "@/components/features/announcements/AnnouncementList";
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

const getAnnouncementsMock = vi.fn();

vi.mock("@/lib/api/announcements", () => ({
  getAnnouncements: (...args: unknown[]) => getAnnouncementsMock(...args),
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
  publishedAt: "2026-07-01T09:00:00Z",
  category: "maintenance",
  body: "本文テキスト",
  targeting: { scope: "all" },
  actionRequired: false,
};

describe("AnnouncementList", () => {
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
});
