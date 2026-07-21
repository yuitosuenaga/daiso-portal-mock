import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HelpdeskInquiryListItem } from "@/components/features/helpdesk-inquiries/HelpdeskInquiryListItem";
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
    title: "商品破損についての問い合わせ",
    category: "defect",
    urgency: "high",
    storeRegion: "Kanto",
    originalText: "本文です。",
    originalLanguage: "ja",
    status: "new",
    createdAt: "2026-06-01T00:00:00.000Z",
    submittedBy: { companyName: "Daiso Japan Trading Co.", country: "JP" },
    ...overrides,
  };
}

function renderItem(overrides: Partial<Inquiry> = {}) {
  return render(
    <ul>
      <HelpdeskInquiryListItem
        inquiry={buildInquiry(overrides)}
        categoryLabel="不良品"
        urgencyLabel="高"
        statusLabel="新規"
        countryLabel="日本"
        claimBadgeLabel="対応中"
        claimedByLabel="対応者"
        locale="ja"
        untitledLabel="(タイトル未設定)"
      />
    </ul>
  );
}

describe("HelpdeskInquiryListItem", () => {
  it("見出しにtitleを表示し、詳細画面へのリンクとする", () => {
    renderItem({ title: "商品破損についての問い合わせ" });

    const link = screen.getByRole("link", {
      name: "商品破損についての問い合わせ",
    });
    expect(link.getAttribute("href")).toBe("/helpdesk/inquiries/inquiry-1");
  });

  it("会社名・カテゴリを補足行として表示する", () => {
    renderItem({
      submittedBy: { companyName: "Daiso Vietnam Co., Ltd.", country: "VN" },
    });

    expect(
      screen.getByText("Daiso Vietnam Co., Ltd. / 不良品")
    ).toBeTruthy();
  });

  it("titleが空文字のとき、代替ラベルを見出しに表示する", () => {
    renderItem({ title: "" });

    const link = screen.getByRole("link", { name: "(タイトル未設定)" });
    expect(link.getAttribute("href")).toBe("/helpdesk/inquiries/inquiry-1");
  });
});
