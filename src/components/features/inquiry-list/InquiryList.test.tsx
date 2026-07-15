import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InquiryList } from "@/components/features/inquiry-list/InquiryList";
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

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) =>
    (key: string) => resolveMessage(namespace, key),
}));

describe("InquiryList", () => {
  it("問い合わせが0件のとき空状態メッセージを表示する", async () => {
    getInquiriesMock.mockResolvedValueOnce([]);

    const jsx = await InquiryList();
    render(jsx);

    expect(screen.getByText("申請はありません")).toBeTruthy();
  });

  it("getInquiriesが例外をthrowしたときエラーメッセージを表示する", async () => {
    getInquiriesMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await InquiryList();
    render(jsx);

    expect(screen.getByText("申請の取得に失敗しました")).toBeTruthy();
  });

  it("取得成功時に各行のタイトル・種別バッジ・本文プレビューを表示する", async () => {
    getInquiriesMock.mockResolvedValueOnce([
      {
        id: "inquiry-001",
        title: "商品破損についての問い合わせ",
        category: "defect",
        urgency: "high",
        storeRegion: "関東",
        originalText: "納品された商品の一部に破損が見られます。至急対応をお願いします。",
        originalLanguage: "ja",
        status: "new",
        createdAt: "2026-06-28T09:15:00.000Z",
        submittedBy: { companyName: "Test Company", country: "JP" },
      },
    ]);

    const jsx = await InquiryList();
    render(jsx);

    expect(
      screen.getByRole("link", { name: "商品破損についての問い合わせ" })
    ).toBeTruthy();
    expect(screen.getByText("不具合", { selector: "span" })).toBeTruthy();
    expect(
      screen.getByText(
        "納品された商品の一部に破損が見られます。至急対応をお願いします。"
      )
    ).toBeTruthy();
    expect(screen.getAllByText("申請一覧")).toHaveLength(1);
  });

  it("titleが空文字の問い合わせでも代替ラベルでリンクが表示される", async () => {
    getInquiriesMock.mockResolvedValueOnce([
      {
        id: "inquiry-002",
        title: "",
        category: "order",
        urgency: "medium",
        storeRegion: "West Coast",
        originalText: "追加発注をお願いしたいです。",
        originalLanguage: "ja",
        status: "new",
        createdAt: "2026-06-28T09:15:00.000Z",
        submittedBy: { companyName: "Test Company", country: "US" },
      },
    ]);

    const jsx = await InquiryList();
    render(jsx);

    const link = screen.getByRole("link", { name: "(タイトル未設定)" });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/inquiry/inquiry-002");
  });

  it("空状態とエラー状態は異なるメッセージで表示される", async () => {
    getInquiriesMock.mockResolvedValueOnce([]);
    const { unmount } = render(await InquiryList());
    const emptyText = screen.getByText("申請はありません").textContent;
    unmount();

    getInquiriesMock.mockRejectedValueOnce(new Error("network error"));
    render(await InquiryList());
    const errorText = screen.getByText(
      "申請の取得に失敗しました"
    ).textContent;

    expect(emptyText).not.toBe(errorText);
  });
});
