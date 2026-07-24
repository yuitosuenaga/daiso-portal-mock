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

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
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
  attachments: [],
  linkedDocumentIds: [],
  translations: [],
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

  it("selfConfirmedが真のとき確認済みバッジを表示する", () => {
    render(
      <AnnouncementListItem
        announcement={BASE_ANNOUNCEMENT}
        categoryLabel="メンテナンス"
        locale="ja"
        selfConfirmed
      />
    );

    expect(
      screen.getByText("announcements.selfReport.confirmed")
    ).toBeTruthy();
  });

  it("selfConfirmedが未指定・偽のとき確認済みバッジを表示しない", () => {
    render(
      <AnnouncementListItem
        announcement={BASE_ANNOUNCEMENT}
        categoryLabel="メンテナンス"
        locale="ja"
      />
    );

    expect(
      screen.queryByText("announcements.selfReport.confirmed")
    ).toBeNull();
  });

  it("actionRequiredが真かつselfCompletedが真のとき対応完了バッジを表示する", () => {
    render(
      <AnnouncementListItem
        announcement={{ ...BASE_ANNOUNCEMENT, actionRequired: true }}
        categoryLabel="メンテナンス"
        locale="ja"
        selfCompleted
      />
    );

    expect(
      screen.getByText("announcements.selfReport.completed")
    ).toBeTruthy();
  });

  it("actionRequiredが偽のときはselfCompletedが真でも対応完了バッジを表示しない", () => {
    render(
      <AnnouncementListItem
        announcement={{ ...BASE_ANNOUNCEMENT, actionRequired: false }}
        categoryLabel="メンテナンス"
        locale="ja"
        selfCompleted
      />
    );

    expect(
      screen.queryByText("announcements.selfReport.completed")
    ).toBeNull();
  });

  it("selfCompletedが未指定・偽のとき対応完了バッジを表示しない", () => {
    render(
      <AnnouncementListItem
        announcement={{ ...BASE_ANNOUNCEMENT, actionRequired: true }}
        categoryLabel="メンテナンス"
        locale="ja"
      />
    );

    expect(
      screen.queryByText("announcements.selfReport.completed")
    ).toBeNull();
  });

  it("actionRequiredが真かつ超過dueDate・selfCompleted未指定のとき期限超過バッジを表示し対応期限を警告色にする", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const overdueDueDate = yesterday.toISOString().slice(0, 10);

    render(
      <AnnouncementListItem
        announcement={{
          ...BASE_ANNOUNCEMENT,
          actionRequired: true,
          dueDate: overdueDueDate,
        }}
        categoryLabel="メンテナンス"
        dueDateLabel="対応期限"
        locale="ja"
      />
    );

    expect(screen.getByText("announcements.overdueBadge")).toBeTruthy();
    expect(screen.getByText(/対応期限/).className).toContain("text-destructive");
  });

  it("selfCompletedが真のとき超過dueDateであっても期限超過バッジを表示しない", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const overdueDueDate = yesterday.toISOString().slice(0, 10);

    render(
      <AnnouncementListItem
        announcement={{
          ...BASE_ANNOUNCEMENT,
          actionRequired: true,
          dueDate: overdueDueDate,
        }}
        categoryLabel="メンテナンス"
        dueDateLabel="対応期限"
        locale="ja"
        selfCompleted
      />
    );

    expect(screen.queryByText("announcements.overdueBadge")).toBeNull();
  });

  it("actionRequiredが偽のとき超過dueDateであっても期限超過バッジを表示しない", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const overdueDueDate = yesterday.toISOString().slice(0, 10);

    render(
      <AnnouncementListItem
        announcement={{
          ...BASE_ANNOUNCEMENT,
          actionRequired: false,
          dueDate: overdueDueDate,
        }}
        categoryLabel="メンテナンス"
        dueDateLabel="対応期限"
        locale="ja"
      />
    );

    expect(screen.queryByText("announcements.overdueBadge")).toBeNull();
  });

  it("dueDateが未超過（明日）のとき期限超過バッジを表示しない", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDueDate = tomorrow.toISOString().slice(0, 10);

    render(
      <AnnouncementListItem
        announcement={{
          ...BASE_ANNOUNCEMENT,
          actionRequired: true,
          dueDate: futureDueDate,
        }}
        categoryLabel="メンテナンス"
        dueDateLabel="対応期限"
        locale="ja"
      />
    );

    expect(screen.queryByText("announcements.overdueBadge")).toBeNull();
  });
});
