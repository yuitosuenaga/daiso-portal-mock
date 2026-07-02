import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FaqPickWidget } from "@/components/features/dashboard/FaqPickWidget";
import type { Faq } from "@/types/faq";
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
}));

function buildFaq(overrides: Partial<Faq>): Faq {
  return {
    id: "faq-1",
    category: "inquiry_method",
    question: "テスト質問",
    answer: "テスト回答",
    ...overrides,
  };
}

describe("FaqPickWidget", () => {
  it("FAQが0件のとき空状態メッセージを表示する", async () => {
    getFaqsMock.mockResolvedValueOnce([]);

    const jsx = await FaqPickWidget();
    render(jsx);

    expect(screen.getByText(messages.dashboard.faqPick.empty)).toBeTruthy();
  });

  it("getFaqsが例外をthrowしたときエラーメッセージを表示する", async () => {
    getFaqsMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await FaqPickWidget();
    render(jsx);

    expect(screen.getByText(messages.dashboard.faqPick.error)).toBeTruthy();
  });

  it("取得結果のうち先頭5件のみ表示し、FAQページへのリンクを持つ", async () => {
    const faqs = Array.from({ length: 8 }, (_, i) =>
      buildFaq({ id: `faq-${i}`, question: `質問${i}` })
    );
    getFaqsMock.mockResolvedValueOnce(faqs);

    const jsx = await FaqPickWidget();
    render(jsx);

    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === "/faq");
    // 5件の質問リンク + ウィジェット下部の「もっと見る」リンク = 6件
    expect(links).toHaveLength(6);
    expect(screen.getByText("質問0")).toBeTruthy();
    expect(screen.queryByText("質問5")).toBeNull();
  });

  it("FAQページ全体への遷移リンクを表示する", async () => {
    getFaqsMock.mockResolvedValueOnce([buildFaq({})]);

    const jsx = await FaqPickWidget();
    render(jsx);

    const viewAllLink = screen.getByRole("link", {
      name: messages.dashboard.faqPick.viewAll,
    });
    expect(viewAllLink.getAttribute("href")).toBe("/faq");
  });
});
