import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { HelpdeskInquiryList } from "@/components/features/helpdesk-inquiries/HelpdeskInquiryList";
import type { Inquiry } from "@/types/inquiry";
import messages from "../../../../messages/ja.json";

function renderWithProvider(jsx: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      {jsx}
    </NextIntlClientProvider>
  );
}

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const getAllInquiriesMock = vi.fn();

vi.mock("@/lib/api/inquiries", () => ({
  getAllInquiries: (...args: unknown[]) => getAllInquiriesMock(...args),
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

describe("HelpdeskInquiryList", () => {
  it("問い合わせが0件のとき空状態メッセージを表示する", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([]);

    const jsx = await HelpdeskInquiryList();
    renderWithProvider(jsx);

    expect(
      screen.getByText(messages.helpdeskInquiries.list.empty)
    ).toBeTruthy();
  });

  it("getAllInquiriesが例外をthrowしたときエラーメッセージを表示する", async () => {
    getAllInquiriesMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await HelpdeskInquiryList();
    renderWithProvider(jsx);

    expect(
      screen.getByText(messages.helpdeskInquiries.list.error)
    ).toBeTruthy();
  });

  it("緊急度優先で並び替えた一覧を表示する", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([
      buildInquiry({ id: "low", urgency: "low", submittedBy: { companyName: "Low Co.", country: "JP" } }),
      buildInquiry({ id: "high", urgency: "high", submittedBy: { companyName: "High Co.", country: "US" } }),
    ]);

    const jsx = await HelpdeskInquiryList();
    renderWithProvider(jsx);

    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/helpdesk/inquiries/"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/helpdesk/inquiries/high",
      "/helpdesk/inquiries/low",
    ]);
  });

  it("対応中の問い合わせにバッジと担当者名を表示する", async () => {
    getAllInquiriesMock.mockResolvedValueOnce([
      buildInquiry({
        id: "claimed",
        claim: { staffName: "田中 太郎", claimedAt: "2026-07-01T00:00:00.000Z" },
      }),
    ]);

    const jsx = await HelpdeskInquiryList();
    renderWithProvider(jsx);

    expect(screen.getByText(/田中 太郎/)).toBeTruthy();
  });
});
