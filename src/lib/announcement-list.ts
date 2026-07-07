import type { Announcement } from "@/types/announcement";

/**
 * 申請者側お知らせ一覧の検索・絞り込み条件。
 * 各フィールドが空文字列のときは当該条件による絞り込みを行わない。
 * `actionRequired` は `"true"`（要対応のみ表示）・`""`（すべて表示）の2値。
 */
export interface AnnouncementFilters {
  keyword: string;
  category: string;
  actionRequired: "" | "true";
}

export const EMPTY_ANNOUNCEMENT_FILTERS: AnnouncementFilters = {
  keyword: "",
  category: "",
  actionRequired: "",
};

/**
 * タイトル（部分一致・大文字小文字を区別しない）・種別・対応要否のAND条件で
 * お知らせを絞り込む。引数の配列の順序は変更しない。
 */
export function filterAnnouncements(
  announcements: Announcement[],
  filters: AnnouncementFilters
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
    return true;
  });
}
