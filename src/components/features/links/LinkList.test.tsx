import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LinkList } from "@/components/features/links/LinkList";
import type { Link } from "@/types/link";
import messages from "../../../../messages/ja.json";

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
  getLocale: async () => "ja",
}));

const INTERNAL_LINK: Link = {
  id: "1",
  title: "社内ポータル",
  url: "https://example.com/internal/portal",
  category: "internal",
  description: "社内向けの説明",
};

describe("LinkList", () => {
  it("リンクが0件のとき空状態メッセージを表示する", async () => {
    getLinksMock.mockResolvedValueOnce([]);

    const jsx = await LinkList();
    render(jsx);

    expect(screen.getByText("リンクはありません")).toBeTruthy();
  });

  it("getLinksが例外をthrowしたときエラーメッセージを表示する", async () => {
    getLinksMock.mockRejectedValueOnce(new Error("network error"));

    const jsx = await LinkList();
    render(jsx);

    expect(screen.getByText("リンクの取得に失敗しました")).toBeTruthy();
  });

  it("特定カテゴリ（internal）のリンクのみ返される場合、そのカテゴリのグループのみ表示される", async () => {
    getLinksMock.mockResolvedValueOnce([INTERNAL_LINK]);

    const jsx = await LinkList();
    render(jsx);

    expect(screen.getByText("社内システム")).toBeTruthy();
    expect(screen.getByText("社内ポータル")).toBeTruthy();

    expect(screen.queryByText("外部サイト")).toBeNull();
    expect(screen.queryByText("資料・マニュアル")).toBeNull();
    expect(screen.queryByText("その他")).toBeNull();

    expect(screen.queryByText("リンクはありません")).toBeNull();
    expect(screen.queryByText("リンクの取得に失敗しました")).toBeNull();
  });
});
