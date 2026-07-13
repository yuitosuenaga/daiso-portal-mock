import type { Announcement } from "@/types/announcement";

/**
 * ヘルプデスク側お知らせ管理一覧の検索・絞り込み条件。
 * 各フィールドが空文字列のときは当該条件による絞り込みを行わない。
 * `actionRequired` は `"true"`（要対応のみ）・`"false"`（対応不要のみ）・`""`（すべて）の3値。
 */
export interface HelpdeskAnnouncementFilters {
  keyword: string;
  category: string;
  actionRequired: "" | "true" | "false";
  status: "" | "draft" | "published";
}

export const EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS: HelpdeskAnnouncementFilters = {
  keyword: "",
  category: "",
  actionRequired: "",
  status: "",
};

/**
 * タイトル（部分一致・大文字小文字を区別しない）・種別・対応要否・公開状態のAND条件で
 * お知らせを絞り込む。引数の配列の順序は変更しない。
 */
export function filterAnnouncementsForHelpdesk(
  announcements: Announcement[],
  filters: HelpdeskAnnouncementFilters
): Announcement[] {
  const keyword = filters.keyword.trim().toLowerCase();

  return announcements.filter((announcement) => {
    if (keyword && !announcement.title.toLowerCase().includes(keyword)) {
      return false;
    }
    if (filters.category && announcement.category !== filters.category) {
      return false;
    }
    if (filters.actionRequired === "true" && !announcement.actionRequired) {
      return false;
    }
    if (filters.actionRequired === "false" && announcement.actionRequired) {
      return false;
    }
    if (filters.status && announcement.status !== filters.status) {
      return false;
    }
    return true;
  });
}
