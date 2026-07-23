import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FaqManagementList } from "@/components/features/helpdesk-faq/FaqManagementList";
import type { FaqWithTimestamp } from "@/lib/server/faq-service";
import messages from "../../../../messages/ja.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
}));

const getFaqsForHelpdeskMock = vi.fn();

vi.mock("@/lib/api/faqs", () => ({
  getFaqsForHelpdesk: (...args: unknown[]) => getFaqsForHelpdeskMock(...args),
}));

vi.mock("@/lib/actions/faqs", () => ({
  deleteFaqAction: vi.fn(),
}));

function resolveMessage(
  namespace: string,
  key: string,
  values?: Record<string, unknown>
): string {
  const segments = `${namespace}.${key}`.split(".");
  let value: unknown = messages;
  for (const segment of segments) {
    if (typeof value !== "object" || value === null) {
      return `${namespace}.${key}`;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  if (typeof value !== "string") {
    return `${namespace}.${key}`;
  }
  if (!values) {
    return value;
  }
  return value.replace(/\{(\w+)\}/g, (_, token: string) =>
    String(values[token] ?? `{${token}}`)
  );
}

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    (key: string, values?: Record<string, unknown>) =>
      resolveMessage(namespace, key, values),
  getLocale: async () => "ja",
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) =>
    (key: string, values?: Record<string, unknown>) =>
      resolveMessage(namespace, key, values),
}));

const FAQ: FaqWithTimestamp = {
  id: "1",
  category: "other",
  question: "テスト質問",
  answer: "テスト回答",
  createdAt: "2026-07-01T09:00:00Z",
  updatedAt: "2026-07-01T09:00:00Z",
};

describe("FaqManagementList", () => {
  it("FAQが0件のとき空状態メッセージを表示する", async () => {
    getFaqsForHelpdeskMock.mockResolvedValueOnce([]);

    const jsx = await FaqManagementList();
    render(jsx);

    expect(screen.getByText("FAQはありません")).toBeTruthy();
  });

  it("getFaqsForHelpdeskが例外をthrowしたときエラーメッセージを表示する", async () => {
    getFaqsForHelpdeskMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await FaqManagementList();
    render(jsx);

    expect(screen.getByText("FAQの取得に失敗しました")).toBeTruthy();
  });

  it("取得成功時にFAQ一覧をカテゴリ表示名付きで表示する", async () => {
    getFaqsForHelpdeskMock.mockResolvedValueOnce([FAQ]);

    const jsx = await FaqManagementList();
    render(jsx);

    expect(screen.getByText("テスト質問")).toBeTruthy();
    expect(screen.getAllByText("その他").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "新規FAQを追加" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "編集" })).toBeTruthy();
  });
});
