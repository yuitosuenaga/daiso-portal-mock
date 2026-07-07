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

  it("問い合わせ本文に添付ファイルがある場合、プレビュー・ダウンロードリンクを表示する", async () => {
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
      attachments: [
        {
          id: "att-1",
          fileName: "evidence.png",
          fileType: "image/png",
          fileSize: 100,
          dataUrl: "data:image/png;base64,AAAA",
        },
      ],
    });
    getInquiryHistoryMock.mockResolvedValueOnce([]);
    getReplyTemplatesByCategoryMock.mockResolvedValueOnce([]);

    const jsx = await HelpdeskInquiryDetail({ id: "inquiry-001" });
    renderWithProvider(jsx);

    // 「添付ファイル」ラベルは返信欄のAttachmentFieldにも表示されるため、
    // 問い合わせ本文セクション分を含めて2件存在することを確認する
    expect(
      screen.getAllByText(messages.helpdeskInquiries.detail.attachmentsLabel)
    ).toHaveLength(2);
    const link = screen.getByRole("link", {
      name: /evidence\.png/,
    }) as HTMLAnchorElement;
    expect(link.download).toBe("evidence.png");
  });

  it("問い合わせ本文に添付ファイルがない場合、添付ファイルセクションを表示しない", async () => {
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

    // 添付ファイルがない場合、返信欄のAttachmentFieldラベル分（1件）のみ存在する
    expect(
      screen.getAllByText(messages.helpdeskInquiries.detail.attachmentsLabel)
    ).toHaveLength(1);
  });

  it("外国語原文かつ日本語訳が設定されている場合、日本語訳をメインに原文を参照として表示する", async () => {
    getInquiryByIdMock.mockResolvedValueOnce({
      id: "inquiry-002",
      category: "order",
      urgency: "medium",
      storeRegion: "West Coast",
      originalText: "We would like to place an additional order.",
      originalLanguage: "en",
      translatedText: "追加発注をお願いしたいです。",
      status: "in_progress",
      createdAt: "2026-06-25T14:30:00.000Z",
      submittedBy: { companyName: "Daiso USA Inc.", country: "US" },
      claim: null,
    });
    getInquiryHistoryMock.mockResolvedValueOnce([]);
    getReplyTemplatesByCategoryMock.mockResolvedValueOnce([]);

    const jsx = await HelpdeskInquiryDetail({ id: "inquiry-002" });
    renderWithProvider(jsx);

    expect(
      screen.getByText(messages.helpdeskInquiries.detail.translatedTextLabel)
    ).toBeTruthy();
    expect(screen.getByText("追加発注をお願いしたいです。")).toBeTruthy();
    expect(
      screen.getByText(messages.helpdeskInquiries.detail.originalTextLabel)
    ).toBeTruthy();
    expect(
      screen.getByText("We would like to place an additional order.")
    ).toBeTruthy();
  });

  it("原文が日本語の場合、日本語訳セクションを表示せず原文のみを表示する", async () => {
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

    expect(
      screen.queryByText(
        messages.helpdeskInquiries.detail.translatedTextLabel
      )
    ).toBeNull();
    expect(
      screen.queryByText(messages.helpdeskInquiries.detail.originalTextLabel)
    ).toBeNull();
    expect(screen.getByText("テスト本文")).toBeTruthy();
  });

  it("外国語原文だが日本語訳が未設定の場合、日本語訳セクションを表示せず原文のみを表示する", async () => {
    getInquiryByIdMock.mockResolvedValueOnce({
      id: "inquiry-003",
      category: "system",
      urgency: "high",
      storeRegion: "Seoul",
      originalText: "원문 텍스트",
      originalLanguage: "ko",
      status: "new",
      createdAt: "2026-06-29T02:45:00.000Z",
      submittedBy: { companyName: "Daiso Korea Co., Ltd.", country: "KR" },
      claim: null,
    });
    getInquiryHistoryMock.mockResolvedValueOnce([]);
    getReplyTemplatesByCategoryMock.mockResolvedValueOnce([]);

    const jsx = await HelpdeskInquiryDetail({ id: "inquiry-003" });
    renderWithProvider(jsx);

    expect(
      screen.queryByText(
        messages.helpdeskInquiries.detail.translatedTextLabel
      )
    ).toBeNull();
    expect(
      screen.queryByText(messages.helpdeskInquiries.detail.originalTextLabel)
    ).toBeNull();
    expect(screen.getByText("원문 텍스트")).toBeTruthy();
  });
});
