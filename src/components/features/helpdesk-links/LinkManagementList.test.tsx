import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    (key: string) => resolveMessage(namespace, key),
  getLocale: async () => "ja",
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) =>
    (key: string, values?: Record<string, unknown>) =>
      resolveMessage(namespace, key, values),
}));

function link(overrides: Partial<LinkWithTimestamp> & { id: string }): LinkWithTimestamp {
  return {
    title: "テストリンク",
    url: "https://example.com",
    category: "other",
    createdAt: "2026-07-01T09:00:00Z",
    ...overrides,
  };
}

const LINK: LinkWithTimestamp = link({ id: "1" });

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
    expect(screen.getAllByText("その他").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "新規リンクを追加" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "編集" })).toBeTruthy();
  });

  it("キーワードで絞り込むと一覧が即時に絞り込まれ、0件時はメッセージを表示する", async () => {
    const otherLink = link({ id: "2", title: "Onboarding Guide" });
    getLinksForHelpdeskMock.mockResolvedValueOnce([LINK, otherLink]);

    const jsx = await LinkManagementList();
    const user = userEvent.setup();
    render(jsx);

    expect(screen.getByText("テストリンク")).toBeTruthy();
    expect(screen.getByText("Onboarding Guide")).toBeTruthy();

    await user.type(screen.getByLabelText("キーワード検索"), "存在しないキーワード");

    expect(screen.getByText("該当するリンクがありません")).toBeTruthy();
    expect(screen.queryByText("テストリンク")).toBeNull();

    await user.click(screen.getByRole("button", { name: "条件をクリア" }));

    expect(screen.getByText("テストリンク")).toBeTruthy();
    expect(screen.getByText("Onboarding Guide")).toBeTruthy();
  });

  it("カテゴリで絞り込める", async () => {
    const internalLink = link({ id: "1", title: "社内リンク", category: "internal" });
    const externalLink = link({ id: "2", title: "外部リンク", category: "external" });
    getLinksForHelpdeskMock.mockResolvedValueOnce([internalLink, externalLink]);

    const jsx = await LinkManagementList();
    const user = userEvent.setup();
    render(jsx);

    await user.selectOptions(screen.getByLabelText("カテゴリ"), "internal");

    expect(screen.getByText("社内リンク")).toBeTruthy();
    expect(screen.queryByText("外部リンク")).toBeNull();
  });

  it("ページネーションで11件を超える一覧は10件ずつ表示される", async () => {
    const manyLinks: LinkWithTimestamp[] = Array.from({ length: 11 }, (_, index) =>
      link({
        id: `link-${index}`,
        title: `リンク${index}`,
        createdAt: new Date(2026, 6, 1 + index).toISOString(),
      })
    );
    getLinksForHelpdeskMock.mockResolvedValueOnce(manyLinks);

    const jsx = await LinkManagementList();
    const user = userEvent.setup();
    render(jsx);

    expect(screen.getByText("リンク0")).toBeTruthy();
    expect(screen.queryByText("リンク10")).toBeNull();

    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByText("リンク10")).toBeTruthy();
  });
});
