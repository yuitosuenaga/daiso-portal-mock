import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InquiryListItem } from "@/components/features/inquiry-list/InquiryListItem";
import type { Inquiry } from "@/types/inquiry";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

function buildInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: "inquiry-1",
    title: "サンプルの問い合わせ",
    category: "defect",
    urgency: "high",
    storeRegion: "関東",
    originalText: "サンプル本文です。",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-06-01T00:00:00.000Z",
    submittedBy: { companyName: "Test Company", country: "JP" },
    ...overrides,
  };
}

function renderItem(overrides: {
  inquiry?: Partial<Inquiry>;
  hasUnreadReply?: boolean;
} = {}) {
  return render(
    <ul>
      <InquiryListItem
        inquiry={buildInquiry(overrides.inquiry)}
        categoryLabel="不具合"
        urgencyLabel="高"
        statusLabel="新規"
        statusFieldLabel="対応状況"
        urgencyFieldLabel="緊急度"
        locale="ja"
        untitledLabel="(タイトル未設定)"
        hasUnreadReply={overrides.hasUnreadReply ?? false}
        newBadgeLabel="新着"
      />
    </ul>
  );
}

describe("InquiryListItem", () => {
  it("hasUnreadReplyがtrueのとき新着インジケーターを表示する", () => {
    renderItem({ hasUnreadReply: true });

    const badge = screen.getByText("新着");
    expect(badge).toBeTruthy();
    expect(badge.getAttribute("aria-label")).toBe("新着");
  });

  it("hasUnreadReplyがfalseのとき新着インジケーターを表示しない", () => {
    renderItem({ hasUnreadReply: false });

    expect(screen.queryByText("新着")).toBeNull();
  });

  it("タイトルへのリンクは変わらず表示される", () => {
    renderItem({ inquiry: { title: "破損対応の件" }, hasUnreadReply: true });

    const link = screen.getByRole("link", { name: "破損対応の件" });
    expect(link.getAttribute("href")).toBe("/inquiry/inquiry-1");
  });
});
