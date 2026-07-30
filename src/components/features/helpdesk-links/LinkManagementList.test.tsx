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

function categoryOf(id: string, name: string) {
  return {
    id,
    parentId: null,
    name,
    displayOrder: 0,
    translations: [],
    linkCount: 0,
    children: [] as {
      id: string;
      parentId: string;
      name: string;
      displayOrder: number;
      translations: never[];
      linkCount: number;
    }[],
  };
}

const getLinksForHelpdeskMock = vi.fn();
const getAllLinkCategoriesMock = vi.fn().mockResolvedValue([
  categoryOf("category-internal", "社内システム"),
  categoryOf("category-external", "外部サイト"),
  categoryOf("category-other", "その他"),
]);

vi.mock("@/lib/api/links", () => ({
  getLinksForHelpdesk: (...args: unknown[]) => getLinksForHelpdeskMock(...args),
}));

vi.mock("@/lib/api/link-categories", () => ({
  getAllLinkCategories: (...args: unknown[]) => getAllLinkCategoriesMock(...args),
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
    categoryId: "category-other",
    subCategoryId: null,
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
    const internalLink = link({
      id: "1",
      title: "社内リンク",
      categoryId: "category-internal",
    });
    const externalLink = link({
      id: "2",
      title: "外部リンク",
      categoryId: "category-external",
    });
    getLinksForHelpdeskMock.mockResolvedValueOnce([internalLink, externalLink]);

    const jsx = await LinkManagementList();
    const user = userEvent.setup();
    render(jsx);

    await user.selectOptions(screen.getByLabelText("大分類"), "category-internal");

    expect(screen.getByText("社内リンク")).toBeTruthy();
    expect(screen.queryByText("外部リンク")).toBeNull();
  });

  it("未設定でカテゴリ未割当のリンクのみ絞り込める", async () => {
    const uncategorizedLink = link({
      id: "1",
      title: "未分類リンク",
      categoryId: null,
    });
    const categorizedLink = link({
      id: "2",
      title: "分類済みリンク",
      categoryId: "category-internal",
    });
    getLinksForHelpdeskMock.mockResolvedValueOnce([uncategorizedLink, categorizedLink]);

    const jsx = await LinkManagementList();
    const user = userEvent.setup();
    render(jsx);

    await user.selectOptions(
      screen.getByLabelText("大分類"),
      "uncategorized"
    );

    expect(screen.getByText("未分類リンク")).toBeTruthy();
    expect(screen.queryByText("分類済みリンク")).toBeNull();
  });

  it("大分類配下の中分類でさらに絞り込める", async () => {
    getAllLinkCategoriesMock.mockResolvedValueOnce([
      {
        ...categoryOf("category-internal", "社内システム"),
        children: [
          {
            id: "sub-hr",
            parentId: "category-internal",
            name: "人事",
            displayOrder: 0,
            translations: [],
            linkCount: 0,
          },
          {
            id: "sub-finance",
            parentId: "category-internal",
            name: "経理",
            displayOrder: 1,
            translations: [],
            linkCount: 0,
          },
        ],
      },
    ]);
    const hrLink = link({
      id: "1",
      title: "人事リンク",
      categoryId: "category-internal",
      subCategoryId: "sub-hr",
    });
    const financeLink = link({
      id: "2",
      title: "経理リンク",
      categoryId: "category-internal",
      subCategoryId: "sub-finance",
    });
    getLinksForHelpdeskMock.mockResolvedValueOnce([hrLink, financeLink]);

    const jsx = await LinkManagementList();
    const user = userEvent.setup();
    render(jsx);

    expect(screen.getByText("人事")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("大分類"), "category-internal");
    await user.selectOptions(screen.getByLabelText("中分類"), "sub-hr");

    expect(screen.getByText("人事リンク")).toBeTruthy();
    expect(screen.queryByText("経理リンク")).toBeNull();
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
