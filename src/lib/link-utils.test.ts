import { describe, expect, it } from "vitest";

import {
  LINK_NEW_BADGE_DAYS,
  filterLinks,
  groupLinksByCategory,
  isRecentlyCreated,
} from "@/lib/link-utils";
import type { LinkWithTimestamp } from "@/types/link";
import type { LinkCategorySummary } from "@/types/link-category";

describe("isRecentlyCreated", () => {
  it(`基準日数（${LINK_NEW_BADGE_DAYS}日）以内のとき true を返す`, () => {
    const now = new Date("2026-07-23T00:00:00Z");
    const createdAt = new Date(
      now.getTime() - LINK_NEW_BADGE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    expect(isRecentlyCreated(createdAt, now)).toBe(true);
  });

  it("基準日数を超えるとき false を返す", () => {
    const now = new Date("2026-07-23T00:00:00Z");
    const createdAt = new Date(
      now.getTime() - (LINK_NEW_BADGE_DAYS + 1) * 24 * 60 * 60 * 1000
    ).toISOString();

    expect(isRecentlyCreated(createdAt, now)).toBe(false);
  });

  it("未来日時（負の差分）のとき false を返す", () => {
    const now = new Date("2026-07-23T00:00:00Z");
    const createdAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    expect(isRecentlyCreated(createdAt, now)).toBe(false);
  });
});

describe("filterLinks", () => {
  const LINKS: LinkWithTimestamp[] = [
    {
      id: "1",
      title: "社内ポータル",
      url: "https://intranet.example.com/portal",
      categoryId: "category-internal",
      subCategoryId: null,
      description: "社内向けの案内サイト",
      createdAt: "2026-07-01T00:00:00Z",
    },
    {
      id: "2",
      title: "Onboarding Guide",
      url: "https://docs.example.com/onboarding",
      categoryId: "category-document",
      subCategoryId: null,
      createdAt: "2026-07-02T00:00:00Z",
    },
  ];

  it("キーワードが空のとき全件を返す", () => {
    expect(filterLinks(LINKS, "")).toEqual(LINKS);
    expect(filterLinks(LINKS, "   ")).toEqual(LINKS);
  });

  it("タイトルの部分一致で絞り込む（大文字小文字を区別しない）", () => {
    expect(filterLinks(LINKS, "onboarding")).toEqual([LINKS[1]]);
  });

  it("説明の部分一致で絞り込む", () => {
    expect(filterLinks(LINKS, "案内サイト")).toEqual([LINKS[0]]);
  });

  it("URLの部分一致で絞り込む", () => {
    expect(filterLinks(LINKS, "intranet")).toEqual([LINKS[0]]);
  });

  it("該当なしのとき空配列を返す", () => {
    expect(filterLinks(LINKS, "存在しないキーワード")).toEqual([]);
  });
});

describe("groupLinksByCategory", () => {
  const CATEGORIES: LinkCategorySummary[] = [
    {
      id: "category-internal",
      name: "社内システム",
      displayOrder: 0,
      subCategories: [
        { id: "sub-hr", name: "人事", displayOrder: 0 },
        { id: "sub-finance", name: "経理", displayOrder: 1 },
      ],
    },
    {
      id: "category-external",
      name: "外部サイト",
      displayOrder: 1,
      subCategories: [],
    },
    {
      id: "category-empty",
      name: "空カテゴリ",
      displayOrder: 2,
      subCategories: [],
    },
  ];

  function link(overrides: Partial<LinkWithTimestamp>): LinkWithTimestamp {
    return {
      id: "1",
      title: "リンク",
      url: "https://example.com",
      categoryId: null,
      subCategoryId: null,
      createdAt: "2026-07-01T00:00:00Z",
      ...overrides,
    };
  }

  it("displayOrder順に大分類グループを生成し、該当リンクが無い大分類は含めない", () => {
    const links = [
      link({ id: "1", categoryId: "category-external" }),
      link({ id: "2", categoryId: "category-internal" }),
    ];

    const groups = groupLinksByCategory(links, CATEGORIES, "未分類");

    expect(groups.map((g) => g.categoryId)).toEqual([
      "category-internal",
      "category-external",
    ]);
  });

  it("中分類IDから中分類名を解決してsubCategoryNameへ付与する", () => {
    const links = [
      link({ id: "1", categoryId: "category-internal", subCategoryId: "sub-hr" }),
    ];

    const groups = groupLinksByCategory(links, CATEGORIES, "未分類");

    expect(groups[0].links[0].subCategoryName).toBe("人事");
  });

  it("中分類未設定・解決不能のときsubCategoryNameはnullになる", () => {
    const links = [
      link({ id: "1", categoryId: "category-internal", subCategoryId: null }),
      link({ id: "2", categoryId: "category-internal", subCategoryId: "sub-unknown" }),
    ];

    const groups = groupLinksByCategory(links, CATEGORIES, "未分類");

    expect(groups[0].links[0].subCategoryName).toBeNull();
    expect(groups[0].links[1].subCategoryName).toBeNull();
  });

  it("categoryIdがnullのリンクが1件以上あるとき末尾に未分類グループを追加する", () => {
    const links = [
      link({ id: "1", categoryId: "category-internal" }),
      link({ id: "2", categoryId: null }),
    ];

    const groups = groupLinksByCategory(links, CATEGORIES, "未分類");

    expect(groups[groups.length - 1]).toMatchObject({
      categoryId: null,
      categoryName: "未分類",
    });
  });

  it("未分類リンクが0件のとき未分類グループを追加しない", () => {
    const links = [link({ id: "1", categoryId: "category-internal" })];

    const groups = groupLinksByCategory(links, CATEGORIES, "未分類");

    expect(groups.some((g) => g.categoryId === null)).toBe(false);
  });

  it("該当リンクが1件も無いとき空配列を返す", () => {
    expect(groupLinksByCategory([], CATEGORIES, "未分類")).toEqual([]);
  });
});
