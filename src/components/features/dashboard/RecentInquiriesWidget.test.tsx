import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecentInquiriesWidget } from "@/components/features/dashboard/RecentInquiriesWidget";
import type { Inquiry } from "@/types/inquiry";
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

const getInquiriesMock = vi.fn();

vi.mock("@/lib/api/inquiries", () => ({
  getInquiries: (...args: unknown[]) => getInquiriesMock(...args),
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

function buildInquiry(overrides: Partial<Inquiry>): Inquiry {
  return {
    id: "inquiry-1",
    category: "defect",
    urgency: "high",
    storeRegion: "Kanto",
    originalText: "テスト本文",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-06-28T09:15:00.000Z",
    submittedBy: { companyName: "Daiso Japan Trading Co.", country: "JP" },
    ...overrides,
  };
}

describe("RecentInquiriesWidget", () => {
  it("問い合わせが0件のとき空状態メッセージを表示する", async () => {
    getInquiriesMock.mockResolvedValueOnce([]);

    const jsx = await RecentInquiriesWidget();
    render(jsx);

    expect(
      screen.getByText(messages.dashboard.recentInquiries.empty)
    ).toBeTruthy();
  });

  it("getInquiriesが例外をthrowしたときエラーメッセージを表示する", async () => {
    getInquiriesMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await RecentInquiriesWidget();
    render(jsx);

    expect(
      screen.getByText(messages.dashboard.recentInquiries.error)
    ).toBeTruthy();
  });

  it("取得結果のうち先頭5件のみ表示し、詳細ページへのリンクを持つ", async () => {
    const inquiries = Array.from({ length: 8 }, (_, i) =>
      buildInquiry({ id: `inquiry-${i}` })
    );
    getInquiriesMock.mockResolvedValueOnce(inquiries);

    const jsx = await RecentInquiriesWidget();
    render(jsx);

    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/inquiry/"));
    expect(links).toHaveLength(5);
    expect(links[0].getAttribute("href")).toBe("/inquiry/inquiry-0");
  });

  it("案件種別・緊急度・対応状況のラベルを表示する", async () => {
    getInquiriesMock.mockResolvedValueOnce([buildInquiry({})]);

    const jsx = await RecentInquiriesWidget();
    render(jsx);

    expect(screen.getByText("不具合")).toBeTruthy();
    expect(screen.getByText("高")).toBeTruthy();
    expect(screen.getByText("新規")).toBeTruthy();
  });

  it("問い合わせ一覧ページへの遷移リンクを表示する", async () => {
    getInquiriesMock.mockResolvedValueOnce([buildInquiry({})]);

    const jsx = await RecentInquiriesWidget();
    render(jsx);

    const viewAllLink = screen.getByRole("link", {
      name: messages.dashboard.recentInquiries.viewAll,
    });
    expect(viewAllLink.getAttribute("href")).toBe("/inquiry");
  });
});
