import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { HelpdeskInquiryDetail } from "@/components/features/helpdesk-inquiries/HelpdeskInquiryDetail";
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

const getInquiryByIdMock = vi.fn();
const getInquiryHistoryMock = vi.fn();
const getReplyTemplatesByCategoryMock = vi.fn();

vi.mock("@/lib/api/inquiries", () => ({
  getInquiryById: (...args: unknown[]) => getInquiryByIdMock(...args),
}));
vi.mock("@/lib/api/inquiry-history", () => ({
  getInquiryHistory: (...args: unknown[]) => getInquiryHistoryMock(...args),
}));
vi.mock("@/lib/api/reply-templates", () => ({
  getReplyTemplatesByCategory: (...args: unknown[]) =>
    getReplyTemplatesByCategoryMock(...args),
}));
vi.mock("@/lib/actions/helpdesk", () => ({
  claimInquiryAction: vi.fn(),
  releaseInquiryClaimAction: vi.fn(),
  changeInquiryStatusAction: vi.fn(),
  sendInquiryReplyAction: vi.fn(),
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

function renderWithProvider(jsx: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      {jsx}
    </NextIntlClientProvider>
  );
}

describe("HelpdeskInquiryDetail", () => {
  it("存在しないIDの場合は見つからないメッセージを表示する", async () => {
    getInquiryByIdMock.mockResolvedValueOnce(null);

    const jsx = await HelpdeskInquiryDetail({ id: "not-exist" });
    renderWithProvider(jsx);

    expect(
      screen.getByText(messages.helpdeskInquiries.detail.notFound)
    ).toBeTruthy();
  });

  it("取得失敗時はエラーメッセージを表示する", async () => {
    getInquiryByIdMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await HelpdeskInquiryDetail({ id: "inquiry-001" });
    renderWithProvider(jsx);

    expect(
      screen.getByText(messages.helpdeskInquiries.detail.error)
    ).toBeTruthy();
  });

  it("存在するIDの場合は詳細情報と各セクションを表示する", async () => {
    getInquiryByIdMock.mockResolvedValueOnce({
      id: "inquiry-001",
      category: "defect",
      urgency: "high",
      storeRegion: "Kanto",
      originalText: "テスト本文",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-06-28T09:15:00.000Z",
      submittedBy: { companyName: "Daiso Japan Trading Co.", country: "JP" },
      claim: null,
    });
    getInquiryHistoryMock.mockResolvedValueOnce([]);
    getReplyTemplatesByCategoryMock.mockResolvedValueOnce([]);

    const jsx = await HelpdeskInquiryDetail({ id: "inquiry-001" });
    renderWithProvider(jsx);

    expect(screen.getByText("テスト本文")).toBeTruthy();
    expect(screen.getByText(messages.helpdeskInquiries.claim.claimButton)).toBeTruthy();
    expect(screen.getByLabelText(messages.helpdeskInquiries.status.label)).toBeTruthy();
    expect(screen.getByLabelText(messages.helpdeskInquiries.reply.bodyLabel)).toBeTruthy();
    expect(screen.getByText(messages.helpdeskInquiries.history.empty)).toBeTruthy();
  });
});
