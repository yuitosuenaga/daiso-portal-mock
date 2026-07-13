import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnnouncementListItem } from "@/components/features/announcements/AnnouncementListItem";
import type { Announcement } from "@/types/announcement";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const BASE_ANNOUNCEMENT: Announcement = {
  id: "1",
  title: "テストお知らせ",
  status: "published",
  publishedAt: "2026-07-01T09:00:00Z",
  category: "maintenance",
  body: "本文",
  targeting: { scope: "all" },
  actionRequired: false,
  publishStartDate: null,
  publishEndDate: null,
  dueDate: null,
  createdAt: "2026-07-01T09:00:00Z",
  updatedAt: "2026-07-01T09:00:00Z",
};

describe("AnnouncementListItem", () => {
  it("actionRequiredが真かつdueDate設定時のみ対応期限を表示する", () => {
    render(
      <AnnouncementListItem
        announcement={{
          ...BASE_ANNOUNCEMENT,
          actionRequired: true,
          dueDate: "2026-07-14",
        }}
        categoryLabel="メンテナンス"
        actionRequiredBadgeLabel="対応が必要"
        dueDateLabel="対応期限"
        locale="ja"
      />
    );

    expect(screen.getByText(/対応期限/)).toBeTruthy();
  });

  it("actionRequiredが偽のときは対応期限を表示しない", () => {
    render(
      <AnnouncementListItem
        announcement={{
          ...BASE_ANNOUNCEMENT,
          actionRequired: false,
          dueDate: "2026-07-14",
        }}
        categoryLabel="メンテナンス"
        actionRequiredBadgeLabel="対応が必要"
        dueDateLabel="対応期限"
        locale="ja"
      />
    );

    expect(screen.queryByText(/対応期限/)).toBeNull();
  });

  it("dueDateがnullのときは対応期限を表示しない", () => {
    render(
      <AnnouncementListItem
        announcement={{
          ...BASE_ANNOUNCEMENT,
          actionRequired: true,
          dueDate: null,
        }}
        categoryLabel="メンテナンス"
        actionRequiredBadgeLabel="対応が必要"
        dueDateLabel="対応期限"
        locale="ja"
      />
    );

    expect(screen.queryByText(/対応期限/)).toBeNull();
  });

  it("dueDateLabelが未指定のときは対応期限を表示しない", () => {
    render(
      <AnnouncementListItem
        announcement={{
          ...BASE_ANNOUNCEMENT,
          actionRequired: true,
          dueDate: "2026-07-14",
        }}
        categoryLabel="メンテナンス"
        locale="ja"
      />
    );

    expect(screen.queryByText(/対応期限/)).toBeNull();
  });

  it("showBodyExcerptが真のときは本文を表示する", () => {
    render(
      <AnnouncementListItem
        announcement={{ ...BASE_ANNOUNCEMENT, body: "本文の要約テキスト" }}
        categoryLabel="メンテナンス"
        locale="ja"
        showBodyExcerpt
      />
    );

    expect(screen.getByText("本文の要約テキスト")).toBeTruthy();
  });

  it("showBodyExcerptが未指定のときは本文を表示しない", () => {
    render(
      <AnnouncementListItem
        announcement={{ ...BASE_ANNOUNCEMENT, body: "本文の要約テキスト" }}
        categoryLabel="メンテナンス"
        locale="ja"
      />
    );

    expect(screen.queryByText("本文の要約テキスト")).toBeNull();
  });
});
