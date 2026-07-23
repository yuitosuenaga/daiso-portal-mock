import { describe, expect, it } from "vitest";

import {
  LINK_NEW_BADGE_DAYS,
  filterLinks,
  isRecentlyCreated,
} from "@/lib/link-utils";
import type { LinkWithTimestamp } from "@/types/link";

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
      category: "internal",
      description: "社内向けの案内サイト",
      createdAt: "2026-07-01T00:00:00Z",
    },
    {
      id: "2",
      title: "Onboarding Guide",
      url: "https://docs.example.com/onboarding",
      category: "document",
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
