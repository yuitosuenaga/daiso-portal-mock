import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuickLinksWidget } from "@/components/features/dashboard/QuickLinksWidget";
import type { Link } from "@/types/link";
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

const getLinksMock = vi.fn();

vi.mock("@/lib/api/links", () => ({
  getLinks: (...args: unknown[]) => getLinksMock(...args),
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

function buildLink(overrides: Partial<Link>): Link {
  return {
    id: "link-1",
    title: "社内ポータル",
    url: "https://example.com/internal/portal",
    category: "internal",
    ...overrides,
  };
}

describe("QuickLinksWidget", () => {
  it("リンクが0件のとき空状態メッセージを表示する", async () => {
    getLinksMock.mockResolvedValueOnce([]);

    const jsx = await QuickLinksWidget();
    render(jsx);

    expect(screen.getByText(messages.dashboard.quickLinks.empty)).toBeTruthy();
  });

  it("getLinksが例外をthrowしたときエラーメッセージを表示する", async () => {
    getLinksMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await QuickLinksWidget();
    render(jsx);

    expect(screen.getByText(messages.dashboard.quickLinks.error)).toBeTruthy();
  });

  it("取得結果のうち先頭6件のみ表示し、新しいタブで開くリンクとして表示する", async () => {
    const links = Array.from({ length: 8 }, (_, i) =>
      buildLink({ id: `link-${i}`, title: `リンク${i}`, url: `https://example.com/${i}` })
    );
    getLinksMock.mockResolvedValueOnce(links);

    const jsx = await QuickLinksWidget();
    render(jsx);

    const renderedLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("https://example.com/"));
    expect(renderedLinks).toHaveLength(6);
    expect(renderedLinks[0].getAttribute("target")).toBe("_blank");
    expect(renderedLinks[0].getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("リンク集ページへの遷移リンクを表示する", async () => {
    getLinksMock.mockResolvedValueOnce([buildLink({})]);

    const jsx = await QuickLinksWidget();
    render(jsx);

    const viewAllLink = screen.getByRole("link", {
      name: messages.dashboard.quickLinks.viewAll,
    });
    expect(viewAllLink.getAttribute("href")).toBe("/links");
  });
});
