import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnnouncementDetail } from "@/components/features/announcements/AnnouncementDetail";
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

const getAnnouncementByIdMock = vi.fn();

vi.mock("@/lib/api/announcements", () => ({
  getAnnouncementById: (...args: unknown[]) => getAnnouncementByIdMock(...args),
}));

vi.mock("@/lib/api/announcement-tracking", () => ({
  isReminderPendingForCompany: async () => false,
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
  title: "テストお知らせ詳細",
  publishedAt: "2026-07-01T09:00:00Z",
  category: "incident",
  body: "詳細本文テキスト",
  targeting: { scope: "all" },
  actionRequired: false,
};

describe("AnnouncementDetail", () => {
  it("getAnnouncementByIdがnullを返したとき見つからないメッセージを表示する", async () => {
    getAnnouncementByIdMock.mockResolvedValueOnce(null);

    const jsx = await AnnouncementDetail({ id: "not-exist" });
    render(jsx);

    expect(screen.getByText("お知らせが見つかりません")).toBeTruthy();
  });

  it("getAnnouncementByIdが例外をthrowしたときエラーメッセージを表示する", async () => {
    getAnnouncementByIdMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await AnnouncementDetail({ id: "1" });
    render(jsx);

    expect(screen.getByText("お知らせの取得に失敗しました")).toBeTruthy();
  });

  it("見つからない状態とエラー状態は異なるメッセージで表示される", async () => {
    getAnnouncementByIdMock.mockResolvedValueOnce(null);
    const { unmount } = render(await AnnouncementDetail({ id: "not-exist" }));
    const notFoundText = screen.getByText("お知らせが見つかりません").textContent;
    unmount();

    getAnnouncementByIdMock.mockRejectedValueOnce(new Error("network error"));
    render(await AnnouncementDetail({ id: "1" }));
    const errorText = screen.getByText("お知らせの取得に失敗しました").textContent;

    expect(notFoundText).not.toBe(errorText);
  });

  it("取得成功時にタイトル・本文を表示する", async () => {
    getAnnouncementByIdMock.mockResolvedValueOnce(ANNOUNCEMENT);

    const jsx = await AnnouncementDetail({ id: "1" });
    render(jsx);

    expect(screen.getByText("テストお知らせ詳細")).toBeTruthy();
    expect(screen.getByText("詳細本文テキスト")).toBeTruthy();
  });

  it("常に一覧へ戻るリンクを表示する", async () => {
    getAnnouncementByIdMock.mockResolvedValueOnce(null);

    const jsx = await AnnouncementDetail({ id: "not-exist" });
    render(jsx);

    expect(screen.getByText("一覧へ戻る")).toBeTruthy();
  });
});
