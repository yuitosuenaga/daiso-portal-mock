import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LinkManagementList } from "@/components/features/helpdesk-links/LinkManagementList";
import type { LinkWithTimestamp } from "@/lib/server/link-service";
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

const getLinksForHelpdeskMock = vi.fn();

vi.mock("@/lib/api/links", () => ({
  getLinksForHelpdesk: (...args: unknown[]) => getLinksForHelpdeskMock(...args),
}));

vi.mock("@/lib/actions/links", () => ({
  deleteLinkAction: vi.fn(),
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

const LINK: LinkWithTimestamp = {
  id: "1",
  title: "テストリンク",
  url: "https://example.com",
  category: "other",
  createdAt: "2026-07-01T09:00:00Z",
};

describe("LinkManagementList", () => {
  it("リンクが0件のとき空状態メッセージを表示する", async () => {
    getLinksForHelpdeskMock.mockResolvedValueOnce([]);

    const jsx = await LinkManagementList();
    render(jsx);

    expect(screen.getByText("リンクはありません")).toBeTruthy();
  });

  it("getLinksForHelpdeskが例外をthrowしたときエラーメッセージを表示する", async () => {
    getLinksForHelpdeskMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await LinkManagementList();
    render(jsx);

    expect(screen.getByText("リンクの取得に失敗しました")).toBeTruthy();
  });

  it("取得成功時にリンク一覧をカテゴリ表示名付きで表示する", async () => {
    getLinksForHelpdeskMock.mockResolvedValueOnce([LINK]);

    const jsx = await LinkManagementList();
    render(jsx);

    expect(screen.getByText("テストリンク")).toBeTruthy();
    expect(screen.getByText("その他")).toBeTruthy();
    expect(screen.getByRole("link", { name: "新規リンクを追加" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "編集" })).toBeTruthy();
  });
});
