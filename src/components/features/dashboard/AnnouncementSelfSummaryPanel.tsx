import { getTranslations } from "next-intl/server";

import { StatsMetricTile } from "@/components/features/inquiry-stats/StatsMetricTile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { computeAnnouncementSelfSummary } from "@/lib/announcement-self-summary";
import { getAnnouncementSelfStatuses } from "@/lib/api/announcement-tracking";
import { getAnnouncements } from "@/lib/api/announcements";
import type { AnnouncementSelfSummary } from "@/lib/announcement-self-summary";

export interface AnnouncementSelfSummaryPanelProps {
  /** お知らせ一覧ページへの遷移先パス（例: "/announcements"） */
  viewAllHref: string;
}

/**
 * 申請者側ダッシュボードに表示する「お知らせの対応状況」サマリパネル。
 * 自社に配信対象が及ぶお知らせについて、本人が未確認の件数と、確認済みだが
 * 自社の対応が未完了の件数を分けて表示する（両者は排他、要件は
 * `computeAnnouncementSelfSummary`のJSDoc参照）。
 * データ取得に失敗した場合は例外を上位へ伝播させず、パネル内にエラー状態を表示する。
 */
export async function AnnouncementSelfSummaryPanel({
  viewAllHref,
}: AnnouncementSelfSummaryPanelProps) {
  const t = await getTranslations("dashboard.announcementSummary");

  let summary: AnnouncementSelfSummary | null = null;
  try {
    const announcements = await getAnnouncements();
    const selfStatuses = await getAnnouncementSelfStatuses(announcements);
    summary = computeAnnouncementSelfSummary(announcements, selfStatuses);
  } catch {
    summary = null;
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary === null ? (
          <p role="alert" className="text-sm text-destructive">
            {t("error")}
          </p>
        ) : summary.total === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
              <StatsMetricTile
                label={t("unconfirmedLabel")}
                value={summary.unconfirmed}
                size="primary"
                tone={summary.unconfirmed > 0 ? "primary" : "default"}
              />
              <StatsMetricTile
                label={t("actionPendingLabel")}
                value={summary.confirmedActionPending}
                size="primary"
                tone={summary.confirmedActionPending > 0 ? "destructive" : "default"}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("totalCaption", { count: summary.total })}
            </p>
          </>
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
 * `AnnouncementSelfSummaryPanel` のデータ取得中に表示するSuspenseフォールバック。
 */
export function AnnouncementSelfSummaryPanelSkeleton() {
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-12" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-12" />
          </div>
        </div>
        <Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
}
