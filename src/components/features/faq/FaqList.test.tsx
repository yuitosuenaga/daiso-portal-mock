import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FaqList } from "@/components/features/faq/FaqList";
import type { Faq } from "@/types/faq";
import messages from "../../../../messages/ja.json";

const getFaqsMock = vi.fn();

vi.mock("@/lib/api/faqs", () => ({
  getFaqs: (...args: unknown[]) => getFaqsMock(...args),
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
  useTranslations: (namespace: string) => (key: string) =>
    resolveMessage(namespace, key),
}));

const INQUIRY_METHOD_FAQ: Faq = {
  id: "1",
  category: "inquiry_method",
  question: "本社への問い合わせはどの方法で行えば良いですか。",
  answer: "ポータル上の「問い合わせ申請」ページから送信してください。",
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-01-01T00:00:00.000Z",
};

describe("FaqList", () => {
  it("FAQが0件のとき空状態メッセージを表示する", async () => {
    getFaqsMock.mockResolvedValueOnce([]);

    const jsx = await FaqList();
    render(jsx);

    expect(screen.getByText("FAQはありません")).toBeTruthy();
  });

  it("getFaqsが例外をthrowしたときエラーメッセージを表示する", async () => {
    getFaqsMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await FaqList();
    render(jsx);

    expect(screen.getByText("FAQの取得に失敗しました")).toBeTruthy();
  });

  it("空状態メッセージとエラーメッセージは異なる", () => {
    expect(resolveMessage("faq", "list.empty")).not.toBe(
      resolveMessage("faq", "list.error"),
    );
  });

  it("特定カテゴリ（inquiry_method）のFAQのみ返される場合、そのカテゴリのグループのみ表示される", async () => {
    getFaqsMock.mockResolvedValueOnce([INQUIRY_METHOD_FAQ]);

    const jsx = await FaqList();
    render(jsx);

    expect(screen.getByText("問い合わせ方法")).toBeTruthy();
    expect(
      screen.getByText("本社への問い合わせはどの方法で行えば良いですか。"),
    ).toBeTruthy();

    expect(screen.queryByText("フォーム入力")).toBeNull();
    expect(screen.queryByText("対応状況")).toBeNull();
    expect(screen.queryByText("その他")).toBeNull();

    expect(screen.queryByText("FAQはありません")).toBeNull();
    expect(screen.queryByText("FAQの取得に失敗しました")).toBeNull();
  });
});
