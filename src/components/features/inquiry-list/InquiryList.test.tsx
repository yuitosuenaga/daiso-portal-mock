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

describe("InquiryList", () => {
  it("問い合わせが0件のとき空状態メッセージを表示する", async () => {
    getInquiriesMock.mockResolvedValueOnce([]);

    const jsx = await InquiryList();
    render(jsx);

    expect(screen.getByText("問い合わせはありません")).toBeTruthy();
  });

  it("getInquiriesが例外をthrowしたときエラーメッセージを表示する", async () => {
    getInquiriesMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await InquiryList();
    render(jsx);

    expect(screen.getByText("問い合わせの取得に失敗しました")).toBeTruthy();
  });

  it("空状態とエラー状態は異なるメッセージで表示される", async () => {
    getInquiriesMock.mockResolvedValueOnce([]);
    const { unmount } = render(await InquiryList());
    const emptyText = screen.getByText("問い合わせはありません").textContent;
    unmount();

    getInquiriesMock.mockRejectedValueOnce(new Error("network error"));
    render(await InquiryList());
    const errorText = screen.getByText(
      "問い合わせの取得に失敗しました"
    ).textContent;

    expect(emptyText).not.toBe(errorText);
  });
});
