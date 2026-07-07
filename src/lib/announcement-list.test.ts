import { describe, expect, it } from "vitest";

import {
  EMPTY_ANNOUNCEMENT_FILTERS,
  filterAnnouncements,
} from "@/lib/announcement-list";
import type { Announcement } from "@/types/announcement";

function buildAnnouncement(overrides: Partial<Announcement>): Announcement {
  return {
    id: "announcement-x",
    title: "サンプルのお知らせ",
    publishedAt: "2026-06-01T00:00:00.000Z",
    category: "other",
    body: "本文",
    targeting: { scope: "all" },
    actionRequired: false,
    ...overrides,
  };
}

describe("filterAnnouncements", () => {
  const announcements = [
    buildAnnouncement({
      id: "1",
      title: "システムメンテナンスのお知らせ",
      category: "maintenance",
      actionRequired: true,
    }),
    buildAnnouncement({
      id: "2",
      title: "新しいFAQページを追加しました",
      category: "other",
      actionRequired: false,
    }),
    buildAnnouncement({
      id: "3",
      title: "決済システム障害の発生について",
      category: "incident",
      actionRequired: true,
    }),
  ];

  it("条件を指定しない場合は全件を順序を維持して返す", () => {
    const result = filterAnnouncements(announcements, EMPTY_ANNOUNCEMENT_FILTERS);

    expect(result.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it("キーワードでタイトルを部分一致検索する（大文字小文字を区別しない）", () => {
    const result = filterAnnouncements(announcements, {
      ...EMPTY_ANNOUNCEMENT_FILTERS,
      keyword: "システム",
    });

    expect(result.map((item) => item.id)).toEqual(["1", "3"]);
  });

  it("種別で絞り込む", () => {
    const result = filterAnnouncements(announcements, {
      ...EMPTY_ANNOUNCEMENT_FILTERS,
      category: "incident",
    });

    expect(result.map((item) => item.id)).toEqual(["3"]);
  });

  it("対応要否『要対応のみ』で絞り込む", () => {
    const result = filterAnnouncements(announcements, {
      ...EMPTY_ANNOUNCEMENT_FILTERS,
      actionRequired: "true",
    });

    expect(result.map((item) => item.id)).toEqual(["1", "3"]);
  });

  it("複数条件はAND条件で適用される", () => {
    const result = filterAnnouncements(announcements, {
      ...EMPTY_ANNOUNCEMENT_FILTERS,
      keyword: "システム",
      actionRequired: "true",
      category: "incident",
    });

    expect(result.map((item) => item.id)).toEqual(["3"]);
  });

  it("元の配列を変更しない", () => {
    const original = [...announcements];

    filterAnnouncements(announcements, {
      ...EMPTY_ANNOUNCEMENT_FILTERS,
      keyword: "システム",
    });

    expect(announcements).toEqual(original);
  });
});
