import { Announcement } from "@/types/announcement";

export interface GetRecentAnnouncementsOptions {
  limit?: number;
}

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "1",
    title: "システムメンテナンスのお知らせ（7月15日 2:00〜4:00）",
    publishedAt: "2026-07-01T09:00:00Z",
    category: "maintenance",
    body: "2026年7月15日 2:00〜4:00の間、システムメンテナンスを実施いたします。メンテナンス中はポータルサイトにアクセスできませんのでご注意ください。ご不便をおかけしますが、何卒ご理解のほどよろしくお願いいたします。",
  },
  {
    id: "2",
    title: "新しいFAQページを追加しました",
    publishedAt: "2026-06-28T09:00:00Z",
    category: "other",
    body: "よくあるお問い合わせをまとめたFAQページを新設しました。お問い合わせの前にぜひご活用ください。今後も内容を随時更新してまいります。",
  },
  {
    id: "3",
    title: "問い合わせフォームの項目を更新しました",
    publishedAt: "2026-06-20T09:00:00Z",
    category: "policy",
    body: "問い合わせ・申請フォームの入力項目を一部更新しました。案件種別・緊急度の選択肢が変更されておりますので、ご利用の際はご確認ください。",
  },
  {
    id: "4",
    title: "夏季休業期間のお知らせ（8月13日〜16日）",
    publishedAt: "2026-06-15T09:00:00Z",
    category: "other",
    body: "誠に恐れ入りますが、8月13日〜16日は夏季休業期間とさせていただきます。休業期間中に受け付けた問い合わせは、休業明けに順次対応いたします。",
  },
  {
    id: "5",
    title: "決済システム障害の発生について",
    publishedAt: "2026-06-10T09:00:00Z",
    category: "incident",
    body: "本日未明、決済システムに障害が発生し、一部の処理が正常に完了しない事象が確認されました。現在は復旧しておりますが、影響を受けた処理については別途ご案内いたします。",
  },
];

export async function getRecentAnnouncements(
  options?: GetRecentAnnouncementsOptions
): Promise<Announcement[]> {
  const limit = options?.limit ?? 3;
  return Promise.resolve(MOCK_ANNOUNCEMENTS.slice(0, limit));
}

/**
 * お知らせ全件を公開日（publishedAt）の降順で返す。
 */
export async function getAnnouncements(): Promise<Announcement[]> {
  const sorted = [...MOCK_ANNOUNCEMENTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  return Promise.resolve(sorted);
}

/**
 * 指定したIDのお知らせを1件返す。該当データが存在しない場合はnullを解決する。
 */
export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const found = MOCK_ANNOUNCEMENTS.find((item) => item.id === id);
  return Promise.resolve(found ?? null);
}
