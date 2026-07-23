import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LinkList } from "@/components/features/links/LinkList";
import type { LinkWithTimestamp } from "@/types/link";
import messages from "../../../../messages/ja.json";

const getLinksMock = vi.fn();

vi.mock("@/lib/api/links", () => ({
  getLinks: (...args: unknown[]) => getLinksMock(...args),
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

const NOW = new Date("2026-07-23T00:00:00Z");

const INTERNAL_LINK: LinkWithTimestamp = {
  id: "1",
  title: "社内ポータル",
  url: "https://example.com/internal/portal",
  category: "internal",
  description: "社内向けの説明\n複数行の補足",
  createdAt: new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
};

const OLD_LINK: LinkWithTimestamp = {
  id: "2",
  title: "古い外部サイト",
  url: "https://example.com/external/old",
  category: "external",
  createdAt: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
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

  it("説明文の改行を保持して表示する", async () => {
    getLinksMock.mockResolvedValueOnce([INTERNAL_LINK]);

    const jsx = await LinkList();
    render(jsx);

    const description = screen.getByText((_, element) =>
      element?.tagName === "P" &&
      element.textContent === "社内向けの説明\n複数行の補足"
    );
    expect(description.className).toContain("whitespace-pre-wrap");
  });

  it("登録から7日以内のリンクに新着バッジを表示し、それより古いリンクには表示しない", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    getLinksMock.mockResolvedValueOnce([INTERNAL_LINK, OLD_LINK]);

    const jsx = await LinkList();
    render(jsx);

    expect(screen.getAllByText("新着").length).toBe(1);

    vi.useRealTimers();
  });

  it("キーワード検索でタイトル・説明・URLに一致するリンクのみ表示し、該当0件のときメッセージを表示する", async () => {
    getLinksMock.mockResolvedValueOnce([INTERNAL_LINK, OLD_LINK]);

    const jsx = await LinkList();
    const user = userEvent.setup();
    render(jsx);

    expect(screen.getByText("社内ポータル")).toBeTruthy();
    expect(screen.getByText("古い外部サイト")).toBeTruthy();

    await user.type(screen.getByLabelText("キーワード検索"), "社内");

    expect(screen.getByText("社内ポータル")).toBeTruthy();
    expect(screen.queryByText("古い外部サイト")).toBeNull();

    await user.clear(screen.getByLabelText("キーワード検索"));
    await user.type(screen.getByLabelText("キーワード検索"), "存在しないキーワード");

    expect(screen.getByText("該当するリンクがありません")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "条件をクリア" }));

    expect(screen.getByText("社内ポータル")).toBeTruthy();
    expect(screen.getByText("古い外部サイト")).toBeTruthy();
  });
});
