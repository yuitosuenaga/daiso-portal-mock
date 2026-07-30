import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LinkPreviewPanelClient } from "@/components/features/helpdesk-links/LinkPreviewPanelClient";
import type { LinkWithTimestamp } from "@/types/link";
import type { LinkCategorySummary } from "@/types/link-category";

function makeLink(overrides: Partial<LinkWithTimestamp> = {}): LinkWithTimestamp {
  return {
    id: "link-1",
    title: "社内ポータル",
    url: "https://example.com",
    categoryId: "cat-1",
    subCategoryId: null,
    createdAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeCategories(name: string): LinkCategorySummary[] {
  return [
    {
      id: "cat-1",
      name,
      displayOrder: 0,
      subCategories: [],
    },
  ];
}

const baseProps = {
  triggerLabel: "プレビューを開く",
  dialogTitle: "申請者側のプレビュー",
  localeTabLabels: { ja: "日本語", en: "English" } as const,
  errorMessage: "プレビューの取得に失敗しました",
};

describe("LinkPreviewPanelClient", () => {
  it("トリガーを押すとダイアログが開き、既定言語（ja）のカテゴリでグループ表示する", () => {
    render(
      <LinkPreviewPanelClient
        {...baseProps}
        links={[makeLink()]}
        hasError={false}
        dataByLocale={{
          ja: {
            categories: makeCategories("社内システム"),
            opensInNewTabLabel: "新しいタブで開きます",
            newBadgeLabel: "新着",
            uncategorizedLabel: "未分類",
            emptyLabel: "リンクはありません",
          },
          en: {
            categories: makeCategories("Internal System"),
            opensInNewTabLabel: "Opens in a new tab",
            newBadgeLabel: "New",
            uncategorizedLabel: "Uncategorized",
            emptyLabel: "No links",
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "プレビューを開く" }));

    expect(screen.getByText("社内システム")).toBeTruthy();
    expect(screen.getByText("社内ポータル")).toBeTruthy();
  });

  it("英語タブへ切り替えると、再取得なしで英語側のカテゴリ名に切り替わる", () => {
    render(
      <LinkPreviewPanelClient
        {...baseProps}
        links={[makeLink()]}
        hasError={false}
        dataByLocale={{
          ja: {
            categories: makeCategories("社内システム"),
            opensInNewTabLabel: "新しいタブで開きます",
            newBadgeLabel: "新着",
            uncategorizedLabel: "未分類",
            emptyLabel: "リンクはありません",
          },
          en: {
            categories: makeCategories("Internal System"),
            opensInNewTabLabel: "Opens in a new tab",
            newBadgeLabel: "New",
            uncategorizedLabel: "Uncategorized",
            emptyLabel: "No links",
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "プレビューを開く" }));
    fireEvent.click(screen.getByRole("tab", { name: "English" }));

    expect(screen.getByText("Internal System")).toBeTruthy();
    expect(screen.queryByText("社内システム")).toBeNull();
  });

  it("データ取得に失敗したとき、エラーメッセージを表示する", () => {
    render(
      <LinkPreviewPanelClient
        {...baseProps}
        links={[]}
        hasError
        dataByLocale={{
          ja: {
            categories: [],
            opensInNewTabLabel: "",
            newBadgeLabel: "",
            uncategorizedLabel: "未分類",
            emptyLabel: "リンクはありません",
          },
          en: {
            categories: [],
            opensInNewTabLabel: "",
            newBadgeLabel: "",
            uncategorizedLabel: "Uncategorized",
            emptyLabel: "No links",
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "プレビューを開く" }));

    expect(screen.getByText("プレビューの取得に失敗しました")).toBeTruthy();
  });

  it("該当するリンクが1件もないとき、空メッセージを表示する", () => {
    render(
      <LinkPreviewPanelClient
        {...baseProps}
        links={[]}
        hasError={false}
        dataByLocale={{
          ja: {
            categories: [],
            opensInNewTabLabel: "",
            newBadgeLabel: "",
            uncategorizedLabel: "未分類",
            emptyLabel: "リンクはありません",
          },
          en: {
            categories: [],
            opensInNewTabLabel: "",
            newBadgeLabel: "",
            uncategorizedLabel: "Uncategorized",
            emptyLabel: "No links",
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "プレビューを開く" }));

    expect(screen.getByText("リンクはありません")).toBeTruthy();
  });
});
