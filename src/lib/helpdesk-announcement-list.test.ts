import { describe, expect, it } from "vitest";

import {
  EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS,
  filterAnnouncementsForHelpdesk,
} from "@/lib/helpdesk-announcement-list";
import type { Announcement } from "@/types/announcement";

function buildAnnouncement(overrides: Partial<Announcement>): Announcement {
  return {
    id: "announcement-x",
    title: "サンプルのお知らせ",
    status: "published",
    publishedAt: "2026-06-01T00:00:00.000Z",
    category: "other",
    body: "本文",
    targeting: { scope: "all" },
    actionRequired: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("filterAnnouncementsForHelpdesk", () => {
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
    buildAnnouncement({
      id: "4",
      title: "下書き中のお知らせ",
      category: "other",
      actionRequired: false,
      status: "draft",
      publishedAt: null,
    }),
  ];

  it("条件を指定しない場合は全件を順序を維持して返す", () => {
    const result = filterAnnouncementsForHelpdesk(
      announcements,
      EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS
    );

    expect(result.map((item) => item.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("公開状態『下書き』で絞り込む", () => {
    const result = filterAnnouncementsForHelpdesk(announcements, {
      ...EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS,
      status: "draft",
    });

    expect(result.map((item) => item.id)).toEqual(["4"]);
  });

  it("公開状態『公開』で絞り込む", () => {
    const result = filterAnnouncementsForHelpdesk(announcements, {
      ...EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS,
      status: "published",
    });

    expect(result.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it("キーワードでタイトルを部分一致検索する（大文字小文字を区別しない）", () => {
    const result = filterAnnouncementsForHelpdesk(announcements, {
      ...EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS,
      keyword: "システム",
    });

    expect(result.map((item) => item.id)).toEqual(["1", "3"]);
  });

  it("種別で絞り込む", () => {
    const result = filterAnnouncementsForHelpdesk(announcements, {
      ...EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS,
      category: "incident",
    });

    expect(result.map((item) => item.id)).toEqual(["3"]);
  });

  it("対応要否『要対応のみ』で絞り込む", () => {
    const result = filterAnnouncementsForHelpdesk(announcements, {
      ...EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS,
      actionRequired: "true",
    });

    expect(result.map((item) => item.id)).toEqual(["1", "3"]);
  });

  it("対応要否『対応不要のみ』で絞り込む", () => {
    const result = filterAnnouncementsForHelpdesk(announcements, {
      ...EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS,
      actionRequired: "false",
    });

    expect(result.map((item) => item.id)).toEqual(["2", "4"]);
  });

  it("複数条件はAND条件で適用される", () => {
    const result = filterAnnouncementsForHelpdesk(announcements, {
      ...EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS,
      keyword: "システム",
      actionRequired: "true",
      category: "maintenance",
    });

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("元の配列を変更しない", () => {
    const original = [...announcements];

    filterAnnouncementsForHelpdesk(announcements, {
      ...EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS,
      keyword: "システム",
    });

    expect(announcements).toEqual(original);
  });
});
