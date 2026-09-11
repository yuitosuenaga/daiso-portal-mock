import { getTranslations } from "next-intl/server";

import { StatsBarList } from "@/components/features/inquiry-stats/StatsBarList";
import type { StatsBarListRow } from "@/components/features/inquiry-stats/StatsBarList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import {
  computeAnnouncementSelfSummary,
  countAnnouncementsByCategory,
  toAnnouncementCategoryBarRows,
  toAnnouncementStatusBarRows,
} from "@/lib/announcement-self-summary";
import { getAnnouncementSelfStatuses } from "@/lib/api/announcement-tracking";
import { getAnnouncements } from "@/lib/api/announcements";
import type { StatsBarRow } from "@/lib/inquiry-breakdown";

export interface AnnouncementSelfSummaryPanelProps {
  /** お知らせ一覧ページへの遷移先パス（例: "/announcements"）。未指定時は「一覧を見る」リンクを表示しない */
  viewAllHref?: string;
}

interface AnnouncementSelfSummaryData {
  total: number;
  statusRows: StatsBarListRow[];
  categoryRows: StatsBarListRow[];
}

/**
 * `StatsBarRow.label`は`null`（i18n側で解決する"others"行等）を許容するが、
 * このパネルの行は常にラベルを解決済みで渡すため、`StatsBarList`が要求する
 * `label: string`へ変換する（実際にnullになることはない）。
 */
function toBarListRows(rows: StatsBarRow[]): StatsBarListRow[] {
  return rows.map((row) => ({ ...row, label: row.label ?? "" }));
}

/**
 * 申請者側ダッシュボードに表示する「お知らせの対応状況」サマリパネル。
 * 自社に配信対象が及ぶお知らせについて、対応状況を「未確認/確認済み・対応未完了/
 * 確認済み・対応完了（対応不要含む）」の3区分の横棒グラフで表示し、
 * カテゴリ別の内訳バーも併せて表示する（要件は`computeAnnouncementSelfSummary`のJSDoc参照）。
 * データ取得に失敗した場合は例外を上位へ伝播させず、パネル内にエラー状態を表示する。
 */
export async function AnnouncementSelfSummaryPanel({
  viewAllHref,
}: AnnouncementSelfSummaryPanelProps) {
  const t = await getTranslations("dashboard.announcementSummary");
  const tCategories = await getTranslations("announcements.categories");

  let data: AnnouncementSelfSummaryData | null = null;
  try {
    const announcements = await getAnnouncements();
    const selfStatuses = await getAnnouncementSelfStatuses(announcements);
    const summary = computeAnnouncementSelfSummary(announcements, selfStatuses);

    const statusRows = toAnnouncementStatusBarRows(summary, {
      unconfirmed: t("unconfirmedLabel"),
      confirmedActionPending: t("actionPendingLabel"),
      confirmedComplete: t("confirmedCompleteLabel"),
    });

    const byCategory = countAnnouncementsByCategory(announcements);
    const categoryRows = toAnnouncementCategoryBarRows(byCategory, {
      maintenance: tCategories("maintenance"),
      policy: tCategories("policy"),
      incident: tCategories("incident"),
      other: tCategories("other"),
    });

    data = {
      total: summary.total,
      statusRows: toBarListRows(statusRows),
      categoryRows: toBarListRows(categoryRows),
    };
  } catch {
    data = null;
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data === null ? (
          <p role="alert" className="text-sm text-destructive">
            {t("error")}
          </p>
        ) : data.total === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <>
            <StatsBarList rows={data.statusRows} unitLabel={t("unit")} />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {t("categoryBreakdownTitle")}
              </p>
              <StatsBarList rows={data.categoryRows} unitLabel={t("unit")} />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("totalCaption", { count: data.total })}
            </p>
          </>
        )}
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            {t("viewAll")}
          </Link>
        ) : null}
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
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-16" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
}
