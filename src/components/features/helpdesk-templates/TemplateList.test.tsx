import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TemplateList } from "@/components/features/helpdesk-templates/TemplateList";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const getReplyTemplatesMock = vi.fn();

vi.mock("@/lib/api/reply-templates", () => ({
  getReplyTemplates: (...args: unknown[]) => getReplyTemplatesMock(...args),
}));

function resolveMessage(namespace: string, key: string, messages: Record<string, unknown>): string {
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

vi.mock("next-intl/server", async () => {
  const messages = (await import("../../../../messages/ja.json")).default;
  return {
    getTranslations: async (namespace: string) =>
      (key: string) => resolveMessage(namespace, key, messages),
  };
});

describe("TemplateList", () => {
  it("カテゴリ別にグループ化して一覧表示し、各テンプレートに編集リンクを表示する", async () => {
    getReplyTemplatesMock.mockResolvedValueOnce([
      { id: "t1", category: "defect", body: "不良品テンプレート" },
      { id: "t2", category: "order", body: "発注テンプレート" },
    ]);

    const jsx = await TemplateList();
    render(jsx);

    expect(screen.getByText("不良品テンプレート")).toBeTruthy();
    expect(screen.getByText("発注テンプレート")).toBeTruthy();

    const editLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.includes("/edit"));
    expect(editLinks.map((link) => link.getAttribute("href")).sort()).toEqual([
      "/helpdesk/templates/t1/edit",
      "/helpdesk/templates/t2/edit",
    ]);

    const newLink = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "/helpdesk/templates/new");
    expect(newLink).toBeTruthy();
  });

  it("テンプレートが0件のとき空状態メッセージを表示する", async () => {
    getReplyTemplatesMock.mockResolvedValueOnce([]);

    const jsx = await TemplateList();
    render(jsx);

    expect(screen.getByText("テンプレートはありません")).toBeTruthy();
  });
});
