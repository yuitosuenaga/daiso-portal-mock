import { Announcement } from "@/types/announcement";

export interface GetRecentAnnouncementsOptions {
  limit?: number;
}

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "1",
    title: "システムメンテナンスのお知らせ（7月15日 2:00〜4:00）",
    publishedAt: "2026-07-01T09:00:00Z",
  },
  {
    id: "2",
    title: "新しいFAQページを追加しました",
    publishedAt: "2026-06-28T09:00:00Z",
  },
  {
    id: "3",
    title: "問い合わせフォームの項目を更新しました",
    publishedAt: "2026-06-20T09:00:00Z",
  },
  {
    id: "4",
    title: "夏季休業期間のお知らせ（8月13日〜16日）",
    publishedAt: "2026-06-15T09:00:00Z",
  },
];

export async function getRecentAnnouncements(
  options?: GetRecentAnnouncementsOptions
): Promise<Announcement[]> {
  const limit = options?.limit ?? 3;
  return Promise.resolve(MOCK_ANNOUNCEMENTS.slice(0, limit));
}
