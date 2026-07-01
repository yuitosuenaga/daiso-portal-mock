import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/api/inquiries", () => ({
  getInquiryById: (...args: unknown[]) => getInquiryByIdMock(...args),
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

    const jsx = await InquiryDetail({ id: "inquiry-001" });
    render(jsx);

    expect(screen.getByText("一覧へ戻る")).toBeTruthy();
  });
});
