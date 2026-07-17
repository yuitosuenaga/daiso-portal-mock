import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { markInquiryReadAction } from "@/lib/actions/inquiry";

import { InquiryDetail } from "@/components/features/inquiry-list/InquiryDetail";
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

vi.mock("@/lib/api/inquiries", () => ({
  getInquiryById: (...args: unknown[]) => getInquiryByIdMock(...args),
}));

vi.mock("@/lib/api/inquiry-history", () => ({
  getInquiryHistory: (...args: unknown[]) => getInquiryHistoryMock(...args),
}));

vi.mock("@/lib/actions/inquiry", () => ({
  sendApplicantMessageAction: vi.fn(),
  markInquiryReadAction: vi.fn().mockResolvedValue(undefined),
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

describe("InquiryDetail", () => {
  it("getInquiryByIdがnullを返したとき見つからないメッセージを表示する", async () => {
    getInquiryByIdMock.mockResolvedValueOnce(null);

    const jsx = await InquiryDetail({ id: "not-exist" });
    render(jsx);

    expect(screen.getByText("問い合わせが見つかりません")).toBeTruthy();
  });

  it("getInquiryByIdが例外をthrowしたときエラーメッセージを表示する", async () => {
    getInquiryByIdMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await InquiryDetail({ id: "inquiry-001" });
    render(jsx);

    expect(screen.getByText("問い合わせの取得に失敗しました")).toBeTruthy();
  });

  it("見つからない状態とエラー状態は異なるメッセージで表示される", async () => {
    getInquiryByIdMock.mockResolvedValueOnce(null);
    const { unmount } = render(await InquiryDetail({ id: "not-exist" }));
    const notFoundText = screen.getByText(
      "問い合わせが見つかりません"
    ).textContent;
    unmount();

    getInquiryByIdMock.mockRejectedValueOnce(new Error("network error"));
    render(await InquiryDetail({ id: "inquiry-001" }));
    const errorText = screen.getByText(
      "問い合わせの取得に失敗しました"
    ).textContent;

    expect(notFoundText).not.toBe(errorText);
  });

  it("見つからない状態でも一覧へ戻るリンクを表示する", async () => {
    getInquiryByIdMock.mockResolvedValueOnce(null);

    const jsx = await InquiryDetail({ id: "not-exist" });
    render(jsx);

    expect(screen.getByText("一覧へ戻る")).toBeTruthy();
  });

  it("エラー状態でも一覧へ戻るリンクを表示する", async () => {
    getInquiryByIdMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await InquiryDetail({ id: "inquiry-001" });
    render(jsx);

    expect(screen.getByText("一覧へ戻る")).toBeTruthy();
  });

  it("取得成功時にも一覧へ戻るリンクを表示する", async () => {
    getInquiryByIdMock.mockResolvedValueOnce({
      id: "inquiry-001",
      title: "商品破損についての問い合わせ",
      category: "defect",
      urgency: "high",
      storeRegion: "関東",
      originalText: "テスト本文",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-06-28T09:15:00.000Z",
      submittedBy: {
        companyName: "Test Company",
        country: "JP",
      },
    });
    getInquiryHistoryMock.mockResolvedValueOnce([]);

    const jsx = await InquiryDetail({ id: "inquiry-001" });
    render(jsx);

    expect(screen.getByText("一覧へ戻る")).toBeTruthy();
  });

  it("取得成功時、詳細画面のマウントをもって既読記録用Server Actionを呼び出す", async () => {
    vi.mocked(markInquiryReadAction).mockClear();
    getInquiryByIdMock.mockResolvedValueOnce({
      id: "inquiry-001",
      title: "商品破損についての問い合わせ",
      category: "defect",
      urgency: "high",
      storeRegion: "関東",
      originalText: "テスト本文",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-06-28T09:15:00.000Z",
      submittedBy: { companyName: "Test Company", country: "JP" },
    });
    getInquiryHistoryMock.mockResolvedValueOnce([]);

    const jsx = await InquiryDetail({ id: "inquiry-001" });
    render(jsx);

    await waitFor(() => {
      expect(markInquiryReadAction).toHaveBeenCalledWith("inquiry-001");
    });
  });

  it("見つからない場合は既読記録用Server Actionを呼び出さない", async () => {
    vi.mocked(markInquiryReadAction).mockClear();
    getInquiryByIdMock.mockResolvedValueOnce(null);

    const jsx = await InquiryDetail({ id: "not-exist" });
    render(jsx);

    expect(markInquiryReadAction).not.toHaveBeenCalled();
  });

  it("取得成功時にタイトルを見出しとして表示する", async () => {
    getInquiryByIdMock.mockResolvedValueOnce({
      id: "inquiry-001",
      title: "商品破損についての問い合わせ",
      category: "defect",
      urgency: "high",
      storeRegion: "関東",
      originalText: "テスト本文",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-06-28T09:15:00.000Z",
      submittedBy: {
        companyName: "Test Company",
        country: "JP",
      },
    });
    getInquiryHistoryMock.mockResolvedValueOnce([]);

    const jsx = await InquiryDetail({ id: "inquiry-001" });
    render(jsx);

    expect(
      screen.getByRole("heading", { name: "商品破損についての問い合わせ" })
    ).toBeTruthy();
  });

  it("titleが空文字のとき代替ラベルを見出しとして表示する", async () => {
    getInquiryByIdMock.mockResolvedValueOnce({
      id: "inquiry-002",
      title: "",
      category: "order",
      urgency: "medium",
      storeRegion: "West Coast",
      originalText: "テスト本文",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-06-28T09:15:00.000Z",
      submittedBy: {
        companyName: "Test Company",
        country: "US",
      },
    });
    getInquiryHistoryMock.mockResolvedValueOnce([]);

    const jsx = await InquiryDetail({ id: "inquiry-002" });
    render(jsx);

    expect(
      screen.getByRole("heading", { name: "(タイトル未設定)" })
    ).toBeTruthy();
  });

  it("対応中の問い合わせでは対応中バッジを表示し、担当者名は表示しない", async () => {
    getInquiryByIdMock.mockResolvedValueOnce({
      id: "inquiry-001",
      title: "商品破損についての問い合わせ",
      category: "defect",
      urgency: "high",
      storeRegion: "関東",
      originalText: "テスト本文",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-06-28T09:15:00.000Z",
      submittedBy: {
        companyName: "Test Company",
        country: "JP",
      },
      claim: {
        staffName: "山田 花子",
        claimedAt: "2026-06-29T00:00:00.000Z",
      },
    });
    getInquiryHistoryMock.mockResolvedValueOnce([]);

    const jsx = await InquiryDetail({ id: "inquiry-001" });
    render(jsx);

    expect(screen.getByText("対応中")).toBeTruthy();
    expect(screen.queryByText("山田 花子")).toBeNull();
  });

  it("対応中でない問い合わせでは対応中バッジを表示しない", async () => {
    getInquiryByIdMock.mockResolvedValueOnce({
      id: "inquiry-001",
      title: "商品破損についての問い合わせ",
      category: "defect",
      urgency: "high",
      storeRegion: "関東",
      originalText: "テスト本文",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-06-28T09:15:00.000Z",
      submittedBy: {
        companyName: "Test Company",
        country: "JP",
      },
      claim: null,
    });
    getInquiryHistoryMock.mockResolvedValueOnce([]);

    const jsx = await InquiryDetail({ id: "inquiry-001" });
    render(jsx);

    expect(screen.queryByText("対応中")).toBeNull();
  });

  it("対応履歴セクションを表示し、返信内容を確認できる", async () => {
    getInquiryByIdMock.mockResolvedValueOnce({
      id: "inquiry-001",
      title: "商品破損についての問い合わせ",
      category: "defect",
      urgency: "high",
      storeRegion: "関東",
      originalText: "テスト本文",
      originalLanguage: "ja",
      status: "resolved",
      createdAt: "2026-06-28T09:15:00.000Z",
      submittedBy: {
        companyName: "Test Company",
        country: "JP",
      },
    });
    getInquiryHistoryMock.mockResolvedValueOnce([
      {
        id: "h1",
        inquiryId: "inquiry-001",
        type: "reply_sent",
        actorName: "田中 太郎",
        occurredAt: "2026-06-29T00:00:00.000Z",
        detail: "交換対応いたします。",
      },
    ]);

    const jsx = await InquiryDetail({ id: "inquiry-001" });
    render(jsx);

    expect(screen.getByText("対応履歴")).toBeTruthy();
    expect(screen.getByText("交換対応いたします。")).toBeTruthy();
    expect(screen.queryByText("田中 太郎")).toBeNull();
  });

  it("問い合わせ本文に添付ファイルがあるとき、添付ファイルラベルとダウンロードリンクを表示する", async () => {
    getInquiryByIdMock.mockResolvedValueOnce({
      id: "inquiry-001",
      title: "商品破損についての問い合わせ",
      category: "defect",
      urgency: "high",
      storeRegion: "関東",
      originalText: "テスト本文",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-06-28T09:15:00.000Z",
      submittedBy: {
        companyName: "Test Company",
        country: "JP",
      },
      attachments: [
        {
          id: "att-1",
          fileName: "photo.png",
          fileType: "image/png",
          fileSize: 1024,
          dataUrl: "data:image/png;base64,AAAA",
        },
      ],
    });
    getInquiryHistoryMock.mockResolvedValueOnce([]);

    const jsx = await InquiryDetail({ id: "inquiry-001" });
    render(jsx);

    // 「添付ファイル」ラベルは追加メッセージ送信フォームのAttachmentFieldにも表示されるため、
    // 問い合わせ本文セクション分を含めて2件存在することを確認する
    expect(screen.getAllByText("添付ファイル")).toHaveLength(2);
    const link = screen.getByRole("link", { name: /photo\.png/ });
    expect(link.getAttribute("href")).toBe("data:image/png;base64,AAAA");
  });

  it("問い合わせ本文に添付ファイルがないとき、本文セクションには添付ファイルラベルを表示しない", async () => {
    getInquiryByIdMock.mockResolvedValueOnce({
      id: "inquiry-001",
      title: "商品破損についての問い合わせ",
      category: "defect",
      urgency: "high",
      storeRegion: "関東",
      originalText: "テスト本文",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-06-28T09:15:00.000Z",
      submittedBy: {
        companyName: "Test Company",
        country: "JP",
      },
    });
    getInquiryHistoryMock.mockResolvedValueOnce([]);

    const jsx = await InquiryDetail({ id: "inquiry-001" });
    render(jsx);

    // 「添付ファイル」ラベルは追加メッセージ送信フォームのAttachmentField分のみ（1件）存在する
    expect(screen.getAllByText("添付ファイル")).toHaveLength(1);
  });

  it("取得成功時に追加メッセージの送信フォームを表示する", async () => {
    getInquiryByIdMock.mockResolvedValueOnce({
      id: "inquiry-001",
      title: "商品破損についての問い合わせ",
      category: "defect",
      urgency: "high",
      storeRegion: "関東",
      originalText: "テスト本文",
      originalLanguage: "ja",
      status: "new",
      createdAt: "2026-06-28T09:15:00.000Z",
      submittedBy: {
        companyName: "Test Company",
        country: "JP",
      },
    });
    getInquiryHistoryMock.mockResolvedValueOnce([]);

    const jsx = await InquiryDetail({ id: "inquiry-001" });
    render(jsx);

    expect(screen.getByLabelText("メッセージ内容")).toBeTruthy();
    expect(screen.getByRole("button", { name: "送信する" })).toBeTruthy();
  });

  it("見つからない状態では追加メッセージの送信フォームを表示しない", async () => {
    getInquiryByIdMock.mockResolvedValueOnce(null);

    const jsx = await InquiryDetail({ id: "not-exist" });
    render(jsx);

    expect(screen.queryByLabelText("メッセージ内容")).toBeNull();
  });
});
