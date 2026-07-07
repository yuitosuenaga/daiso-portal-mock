import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnnouncementManagementList } from "@/components/features/helpdesk-announcements/AnnouncementManagementList";
import type { Announcement } from "@/types/announcement";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/actions/announcements", () => ({
  deleteAnnouncementAction: vi.fn(),
}));

const getAllAnnouncementsMock = vi.fn();

vi.mock("@/lib/api/announcements", () => ({
  getAllAnnouncements: (...args: unknown[]) => getAllAnnouncementsMock(...args),
}));

function resolveMessage(namespace: string, key: string): string {
  const messages: Record<string, Record<string, string>> = {
    "helpdeskAnnouncements.list": {
      title: "お知らせ管理",
      description: "海外販社向けのお知らせを作成・編集・削除できます。",
      empty: "お知らせはありません",
      error: "お知らせの取得に失敗しました",
      addButton: "新規お知らせを作成",
      editLink: "編集",
      deleteButton: "削除",
      deleteConfirm: "このお知らせを削除しますか？",
      targetingAllLabel: "全体一律",
      targetingCountriesLabel: "配信対象国",
      actionRequiredBadge: "要対応",
    },
    "helpdeskAnnouncements.list.filter": {
      keywordLabel: "タイトル検索",
      keywordPlaceholder: "タイトルに含まれる語句",
      categoryLabel: "種別",
      categoryAll: "すべての種別",
      actionRequiredLabel: "対応要否",
      actionRequiredAll: "すべて",
      actionRequiredTrue: "要対応のみ",
      actionRequiredFalse: "対応不要のみ",
      clearButton: "クリア",
      noResults: "該当するお知らせがありません",
    },
    "announcements.categories": {
      maintenance: "メンテナンス",
      policy: "制度変更",
      incident: "障害情報",
      other: "その他",
    },
    "inquiryForm.options.country": {
      VN: "ベトナム",
      US: "アメリカ合衆国",
    },
  };
  return messages[namespace]?.[key] ?? `${namespace}.${key}`;
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

function buildAnnouncement(overrides: Partial<Announcement>): Announcement {
  return {
    id: "1",
    title: "テストお知らせ",
    publishedAt: "2026-07-01T09:00:00Z",
    category: "maintenance",
    body: "本文",
    targeting: { scope: "all" },
    actionRequired: false,
    ...overrides,
  };
}

describe("AnnouncementManagementList", () => {
  it("お知らせが0件のとき空状態メッセージを表示する", async () => {
    getAllAnnouncementsMock.mockResolvedValueOnce([]);

    const jsx = await AnnouncementManagementList();
    render(jsx);

    expect(screen.getByText("お知らせはありません")).toBeTruthy();
  });

  it("getAllAnnouncementsが例外をthrowしたときエラーメッセージを表示する", async () => {
    getAllAnnouncementsMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await AnnouncementManagementList();
    render(jsx);

    expect(screen.getByText("お知らせの取得に失敗しました")).toBeTruthy();
  });

  it("全件を表示し、種別・配信対象・編集リンクを表示する", async () => {
    getAllAnnouncementsMock.mockResolvedValueOnce([
      buildAnnouncement({ id: "1", title: "全体向け", targeting: { scope: "all" } }),
      buildAnnouncement({
        id: "2",
        title: "国指定向け",
        targeting: { scope: "countries", countries: ["VN"] },
      }),
    ]);

    const jsx = await AnnouncementManagementList();
    render(jsx);

    expect(screen.getByText("全体向け")).toBeTruthy();
    expect(screen.getByText("国指定向け")).toBeTruthy();
    expect(screen.getByText("全体一律")).toBeTruthy();
    expect(screen.getByText(/配信対象国: ベトナム/)).toBeTruthy();

    const editLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.includes("/edit"));
    expect(editLinks.map((link) => link.getAttribute("href")).sort()).toEqual([
      "/helpdesk/announcements/1/edit",
      "/helpdesk/announcements/2/edit",
    ]);
  });
});
