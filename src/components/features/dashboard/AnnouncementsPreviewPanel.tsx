import { getLocale, getTranslations } from "next-intl/server";

import { AnnouncementListItem } from "@/components/features/announcements/AnnouncementListItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { getRecentAnnouncements } from "@/lib/api/announcements";
import type { Announcement } from "@/types/announcement";

const PREVIEW_LIMIT = 5;
const SKELETON_ITEM_COUNT = 3;

export interface AnnouncementsPreviewPanelProps {
  /** お知らせ一覧ページへの遷移先パス（例: "/announcements"） */
  viewAllHref: string;
}

/**
 * 申請者側ダッシュボードのナビゲーションカード群下部に表示する
 * 「最新のお知らせ」プレビューパネル。
 *
 * 直近のお知らせを最大5件、公開日の降順で一覧表示し、末尾にお知らせ一覧ページへの
 * 導線リンクを表示する。データ取得に失敗した場合は例外を上位へ伝播させず、
 * パネル内にエラー状態を表示する。
 */
export async function AnnouncementsPreviewPanel({
  viewAllHref,
}: AnnouncementsPreviewPanelProps) {
  const [t, tCategories, locale] = await Promise.all([
    getTranslations("dashboard.announcementsPreview"),
    getTranslations("announcements.categories"),
    getLocale(),
  ]);

  let announcements: Announcement[] | null = null;
  try {
    announcements = await getRecentAnnouncements({ limit: PREVIEW_LIMIT });
  } catch {
    announcements = null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements === null ? (
          <p role="alert" className="text-sm text-destructive">
            {t("error")}
          </p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {announcements.map((announcement) => (
              <AnnouncementListItem
                key={announcement.id}
                announcement={announcement}
                categoryLabel={tCategories(announcement.category)}
                locale={locale}
              />
            ))}
          </ul>
        )}
        <Link
          href={viewAllHref}
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          {t("viewAll")}
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * `AnnouncementsPreviewPanel` のデータ取得中に表示するSuspenseフォールバック。
 * パネル本体と同様のCardレイアウトで、リスト項目分のスケルトンを表示する。
 */
export function AnnouncementsPreviewPanelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y divide-border">
          {Array.from({ length: SKELETON_ITEM_COUNT }, (_, index) => (
            <li key={index} className="space-y-2 py-3 first:pt-0 last:pb-0">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </li>
          ))}
        </ul>
        <Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
}
