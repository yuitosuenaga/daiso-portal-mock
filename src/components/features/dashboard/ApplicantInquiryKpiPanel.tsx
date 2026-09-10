import { AlertTriangle } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { getInquiries, getUnreadReplyInquiryIds } from "@/lib/api/inquiries";
import {
  computeApplicantInquiryStats,
  toUrgencyRows,
  type ApplicantInquiryStats,
} from "@/lib/inquiry-stats";
import { toStatusSegments } from "@/lib/helpdesk-inquiry-stats";
import { toCategoryBarRows } from "@/lib/inquiry-breakdown";
import { formatIntakeDateLabel, toIntakeTrendColumns } from "@/lib/inquiry-intake-trend";
import { buildInquiryListHref } from "@/lib/inquiry-filter-query";
import { toReferenceDateKey } from "@/lib/reference-date";
import { INQUIRY_CATEGORY_CODES } from "@/lib/constants/inquiry-options";
import { StatsBarList } from "@/components/features/inquiry-stats/StatsBarList";
import { StatsMetricTile } from "@/components/features/inquiry-stats/StatsMetricTile";
import { IntakeTrendBarChart } from "@/components/features/inquiry-stats/IntakeTrendBarChart";
import { StatusBreakdownBar } from "@/components/features/inquiry-stats/StatusBreakdownBar";
import { UrgencyBreakdownBarList } from "@/components/features/inquiry-stats/UrgencyBreakdownBarList";
import type { Inquiry } from "@/types/inquiry";

export interface ApplicantInquiryKpiPanelProps {
  /** 問合せ一覧ページへの遷移先パス（例: "/inquiry"） */
  listHref: string;
}

/**
 * 申請者側ダッシュボードの最上部に配置するKPI・グラフパネル。
 * 一覧画面のサマリパネル（`InquiryStatsPanel`）と同じ集計関数
 * （`computeApplicantInquiryStats`）を使い、フィルタ前の全件を渡すことで
 * 「一覧画面のフィルタなし状態と同じ数値」を表示し、両画面の数値の一貫性を保つ。
 * 各要素は一覧画面への絞り込み付きリンクになる（`buildInquiryListHref`）。
 * データ取得に失敗した場合は例外を上位へ伝播させず、パネル内にエラー状態を表示する。
 */
export async function ApplicantInquiryKpiPanel({
  listHref,
}: ApplicantInquiryKpiPanelProps) {
  const [t, tListStats, tAnalytics, tOptions, tStatus, locale] = await Promise.all([
    getTranslations("dashboard.inquiryKpi"),
    getTranslations("inquiryList.stats"),
    getTranslations("inquiryAnalytics"),
    getTranslations("inquiryForm.options"),
    getTranslations("inquiryList.status"),
    getLocale(),
  ]);

  const referenceDate = new Date();
  let stats: ApplicantInquiryStats | null = null;
  try {
    const [inquiries, unreadInquiryIds] = await Promise.all([
      getInquiries(),
      getUnreadReplyInquiryIds().catch(() => [] as string[]),
    ]);
    stats = computeApplicantInquiryStats(inquiries, {
      unreadInquiryIds: new Set(unreadInquiryIds),
      referenceDate,
    });
  } catch {
    stats = null;
  }

  if (stats === null) {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p role="alert" className="text-sm text-destructive">
            {t("error")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (stats.total === 0) {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </CardContent>
      </Card>
    );
  }

  const categoryLabels = INQUIRY_CATEGORY_CODES.reduce(
    (labels, code) => {
      labels[code] = tOptions(`category.${code}`);
      return labels;
    },
    {} as Record<Inquiry["category"], string>
  );

  const statusLabels = {
    new: tStatus("new"),
    in_progress: tStatus("in_progress"),
    resolved: tStatus("resolved"),
  } as const;

  const urgencyLabels = {
    high: tOptions("urgency.high"),
    medium: tOptions("urgency.medium"),
    low: tOptions("urgency.low"),
  } as const;

  const statusSegments = toStatusSegments(stats.byStatus, stats.total);
  const urgencyRows = toUrgencyRows(stats);
  const categoryRows = toCategoryBarRows(stats.byCategory, categoryLabels).map((row) => ({
    ...row,
    label: row.label ?? "",
  }));
  const intakeColumns = toIntakeTrendColumns(stats.dailyIntake);
  const intakeAriaLabelByDateKey: Record<string, string> = {};
  for (const column of intakeColumns) {
    intakeAriaLabelByDateKey[column.dateKey] = tAnalytics("intake.columnLabel", {
      date: formatIntakeDateLabel(column.dateKey, locale),
      count: column.count,
    });
  }

  const categoryHrefByKey: Record<string, string> = {};
  for (const row of categoryRows) {
    categoryHrefByKey[row.key] = buildInquiryListHref(listHref, {
      category: row.key as Inquiry["category"],
    });
  }

  const intakeHrefByDateKey: Record<string, string> = {};
  for (const column of intakeColumns) {
    intakeHrefByDateKey[column.dateKey] = buildInquiryListHref(listHref, {
      receivedOn: column.dateKey,
    });
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatsMetricTile
            label={tListStats("unreadLabel")}
            value={stats.unread}
            zeroLabel={tListStats("unreadNone")}
            size="primary"
            tone="primary"
            href={buildInquiryListHref(listHref, { unreadOnly: true })}
          />
          <StatsMetricTile
            label={tListStats("awaitingResponseLabel")}
            value={stats.awaitingResponse}
            size="primary"
            href={buildInquiryListHref(listHref, { status: "new" })}
          />
          <StatsMetricTile
            label={tListStats("unresolvedLabel")}
            value={stats.unresolved}
            size="primary"
            href={buildInquiryListHref(listHref, { unresolvedOnly: true })}
          />
          <StatsMetricTile
            label={t("todayLabel")}
            value={stats.todayCount}
            zeroLabel={t("todayNone")}
            size="primary"
            href={buildInquiryListHref(listHref, {
              receivedOn: toReferenceDateKey(referenceDate),
            })}
          />
        </div>

        {stats.highUrgencyUnresolved > 0 && (
          <Link
            href={buildInquiryListHref(listHref, {
              urgency: "high",
              unresolvedOnly: true,
            })}
            className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {tListStats("highUrgencyAlert", { count: stats.highUrgencyUnresolved })}
          </Link>
        )}
        {stats.staleAwaitingResponse > 0 && (
          <Link
            href={buildInquiryListHref(listHref, { status: "new", aging: "over72h" })}
            className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {tListStats("staleAwaitingResponseAlert", {
              count: stats.staleAwaitingResponse,
            })}
          </Link>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              {tListStats("statusBreakdownTitle")}
            </h3>
            <StatusBreakdownBar
              segments={statusSegments}
              statusLabels={statusLabels}
              unitLabel={tListStats("unit")}
              hrefByStatus={{
                new: buildInquiryListHref(listHref, { status: "new" }),
                in_progress: buildInquiryListHref(listHref, { status: "in_progress" }),
                resolved: buildInquiryListHref(listHref, { status: "resolved" }),
              }}
            />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              {tListStats("urgencyBreakdownTitle")}
            </h3>
            <UrgencyBreakdownBarList
              rows={urgencyRows}
              urgencyLabels={urgencyLabels}
              unitLabel={tListStats("unit")}
              emptyMessage={tListStats("urgencyBreakdownEmpty")}
            />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              {tAnalytics("category.title")}
            </h3>
            <StatsBarList
              rows={categoryRows}
              unitLabel={tListStats("unit")}
              emptyMessage={tAnalytics("category.empty")}
              hrefByKey={categoryHrefByKey}
            />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              {tAnalytics("intake.submittedTitle")}
            </h3>
            <IntakeTrendBarChart
              columns={intakeColumns}
              locale={locale}
              unitLabel={tListStats("unit")}
              emptyMessage={tAnalytics("intake.empty")}
              ariaLabelByDateKey={intakeAriaLabelByDateKey}
              hrefByDateKey={intakeHrefByDateKey}
            />
          </div>
        </div>

        <Link
          href={listHref}
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          {t("viewAll")}
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * `ApplicantInquiryKpiPanel` のデータ取得中に表示するSuspenseフォールバック。
 */
export function ApplicantInquiryKpiPanelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-16" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
}
