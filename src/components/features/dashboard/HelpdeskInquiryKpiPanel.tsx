import { AlertTriangle } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { getAllInquiries } from "@/lib/api/inquiries";
import { getCurrentHelpdeskStaffName } from "@/lib/api/current-staff";
import {
  computeHelpdeskInquiryStats,
  toStaffLoadRows,
  toStatusSegments,
  type HelpdeskInquiryStats,
} from "@/lib/helpdesk-inquiry-stats";
import {
  toAgingBarRows,
  toCategoryBarRows,
  toCountryBarRows,
} from "@/lib/inquiry-breakdown";
import { formatIntakeDateLabel, toIntakeTrendColumns } from "@/lib/inquiry-intake-trend";
import { INQUIRY_AGING_BUCKETS, type InquiryAgingBucket } from "@/lib/inquiry-aging";
import { buildHelpdeskInquiryListHref } from "@/lib/helpdesk-inquiry-filter-query";
import { toReferenceDateKey } from "@/lib/reference-date";
import {
  INQUIRY_CATEGORY_CODES,
  INQUIRY_COUNTRY_CODES,
} from "@/lib/constants/inquiry-options";
import { StatsBarList } from "@/components/features/inquiry-stats/StatsBarList";
import { StatsMetricTile } from "@/components/features/inquiry-stats/StatsMetricTile";
import { IntakeTrendBarChart } from "@/components/features/inquiry-stats/IntakeTrendBarChart";
import { StatusBreakdownBar } from "@/components/features/inquiry-stats/StatusBreakdownBar";
import { StaffLoadBarList } from "@/components/features/helpdesk-inquiries/StaffLoadBarList";
import type { Inquiry } from "@/types/inquiry";

export interface HelpdeskInquiryKpiPanelProps {
  /** 問い合わせ一覧ページへの遷移先パス（例: "/helpdesk/inquiries"） */
  listHref: string;
}

const AGING_BUCKET_LABEL_KEY: Record<InquiryAgingBucket, string> = {
  lt24h: "aging.lt24h",
  h24to72: "aging.h24to72",
  d3to7: "aging.d3to7",
  gte7d: "aging.gte7d",
};

/**
 * ヘルプデスク側ダッシュボードの最上部に配置するKPI・グラフパネル。
 * 一覧画面のサマリパネル（`HelpdeskInquiryStatsPanel`）と同じ集計関数
 * （`computeHelpdeskInquiryStats`）を使い、フィルタ前の全件を渡すことで
 * 「一覧画面のフィルタなし状態と同じ数値」を表示し、両画面の数値の一貫性を保つ。
 * 各要素は一覧画面への絞り込み付きリンクになる（`buildHelpdeskInquiryListHref`）。
 * データ取得に失敗した場合は例外を上位へ伝播させず、パネル内にエラー状態を表示する。
 */
export async function HelpdeskInquiryKpiPanel({
  listHref,
}: HelpdeskInquiryKpiPanelProps) {
  const [t, tStats, tAnalytics, tOptions, tStatus, locale] = await Promise.all([
    getTranslations("helpdeskDashboard.kpi"),
    getTranslations("helpdeskInquiries.stats"),
    getTranslations("inquiryAnalytics"),
    getTranslations("inquiryForm.options"),
    getTranslations("inquiryList.status"),
    getLocale(),
  ]);

  let stats: HelpdeskInquiryStats | null = null;
  let currentStaffName: string | null = null;
  const referenceDate = new Date();
  try {
    const [inquiries, staffName] = await Promise.all([
      getAllInquiries(),
      getCurrentHelpdeskStaffName(),
    ]);
    currentStaffName = staffName;
    stats = computeHelpdeskInquiryStats(inquiries, {
      referenceDate,
      currentStaffName: currentStaffName ?? undefined,
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

  const categoryLabels = INQUIRY_CATEGORY_CODES.reduce(
    (labels, code) => {
      labels[code] = tOptions(`category.${code}`);
      return labels;
    },
    {} as Record<Inquiry["category"], string>
  );

  const countryLabels = INQUIRY_COUNTRY_CODES.reduce(
    (labels, code) => {
      labels[code] = tOptions(`country.${code}`);
      return labels;
    },
    {} as Record<string, string>
  );

  const statusLabels = {
    new: tStatus("new"),
    in_progress: tStatus("in_progress"),
    resolved: tStatus("resolved"),
  } as const;

  const agingLabels: Record<InquiryAgingBucket, string> = INQUIRY_AGING_BUCKETS.reduce(
    (labels, bucket) => {
      labels[bucket] = tAnalytics(AGING_BUCKET_LABEL_KEY[bucket]);
      return labels;
    },
    {} as Record<InquiryAgingBucket, string>
  );

  const statusSegments = toStatusSegments(stats.byStatus, stats.total);
  const staffLoadRows = toStaffLoadRows(stats);
  const categoryRows = toCategoryBarRows(stats.byCategory, categoryLabels).map((row) => ({
    ...row,
    label: row.label ?? "",
  }));
  const COUNTRY_MAX_ROWS = 5;
  const otherCountriesCount = Math.max(0, stats.byCountry.length - COUNTRY_MAX_ROWS);
  const countryRows = toCountryBarRows(stats.byCountry, countryLabels, {
    maxRows: COUNTRY_MAX_ROWS,
  }).map((row) => ({
    ...row,
    label: row.label ?? tAnalytics("country.others", { count: otherCountriesCount }),
  }));
  const agingRows = toAgingBarRows(stats.unresolvedAging, agingLabels).map((row) => ({
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

  const staffHrefByKey: Record<string, string> = {
    unclaimed: buildHelpdeskInquiryListHref(listHref, {
      unclaimedOnly: true,
      unresolvedOnly: true,
    }),
  };
  for (const staff of stats.claimedByStaff) {
    staffHrefByKey[`staff:${staff.staffName}`] = buildHelpdeskInquiryListHref(listHref, {
      claimedBy: staff.staffName,
      unresolvedOnly: true,
    });
  }

  const categoryHrefByKey: Record<string, string> = {};
  for (const row of categoryRows) {
    categoryHrefByKey[row.key] = buildHelpdeskInquiryListHref(listHref, {
      category: row.key as Inquiry["category"],
    });
  }

  const countryHrefByKey: Record<string, string> = {};
  for (const row of countryRows) {
    if (row.key === "others") {
      continue;
    }
    countryHrefByKey[row.key] = buildHelpdeskInquiryListHref(listHref, {
      country: row.key,
      unresolvedOnly: true,
    });
  }

  const agingHrefByKey: Record<string, string> = {};
  for (const bucket of INQUIRY_AGING_BUCKETS) {
    agingHrefByKey[bucket] = buildHelpdeskInquiryListHref(listHref, {
      aging: bucket,
      unresolvedOnly: true,
    });
  }

  const intakeHrefByDateKey: Record<string, string> = {};
  for (const column of intakeColumns) {
    intakeHrefByDateKey[column.dateKey] = buildHelpdeskInquiryListHref(listHref, {
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
            label={t("unresolvedLabel")}
            value={stats.unresolved}
            zeroLabel={t("none")}
            size="primary"
            tone="primary"
            href={buildHelpdeskInquiryListHref(listHref, { unresolvedOnly: true })}
          />
          <StatsMetricTile
            label={t("unclaimedLabel")}
            value={stats.unclaimed}
            zeroLabel={t("none")}
            size="primary"
            tone="primary"
            href={buildHelpdeskInquiryListHref(listHref, {
              unclaimedOnly: true,
              unresolvedOnly: true,
            })}
          />
          {stats.mine > 0 && currentStaffName && (
            <StatsMetricTile
              label={tStats("mineLabel")}
              value={stats.mine}
              caption={tStats("mineCaption")}
              size="primary"
              tone="primary"
              href={buildHelpdeskInquiryListHref(listHref, {
                claimedBy: currentStaffName,
                unresolvedOnly: true,
              })}
            />
          )}
          <StatsMetricTile
            label={t("todayLabel")}
            value={stats.todayCount}
            zeroLabel={t("todayNone")}
            caption={
              stats.todayUnresolved > 0
                ? t("todayUnresolvedCaption", { count: stats.todayUnresolved })
                : undefined
            }
            size="primary"
            href={buildHelpdeskInquiryListHref(listHref, {
              receivedOn: toReferenceDateKey(referenceDate),
            })}
          />
        </div>

        {stats.unclaimedHighUrgency > 0 && (
          <Link
            href={buildHelpdeskInquiryListHref(listHref, {
              unclaimedOnly: true,
              unresolvedOnly: true,
              urgency: "high",
            })}
            className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {tStats("highUrgencyAlert", { count: stats.unclaimedHighUrgency })}
          </Link>
        )}
        {stats.staleUnclaimed > 0 && (
          <Link
            href={buildHelpdeskInquiryListHref(listHref, {
              unclaimedOnly: true,
              unresolvedOnly: true,
              aging: "over24h",
            })}
            className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {tStats("staleUnclaimedAlert", { count: stats.staleUnclaimed })}
          </Link>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              {tStats("statusBreakdownTitle")}
            </h3>
            <StatusBreakdownBar
              segments={statusSegments}
              statusLabels={statusLabels}
              unitLabel={tStats("unit")}
              hrefByStatus={{
                new: buildHelpdeskInquiryListHref(listHref, { status: "new" }),
                in_progress: buildHelpdeskInquiryListHref(listHref, {
                  status: "in_progress",
                }),
                resolved: buildHelpdeskInquiryListHref(listHref, { status: "resolved" }),
              }}
            />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              {tStats("staffLoadTitle")}
            </h3>
            <StaffLoadBarList rows={staffLoadRows} hrefByKey={staffHrefByKey} />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              {tAnalytics("category.title")}
            </h3>
            <StatsBarList
              rows={categoryRows}
              unitLabel={tStats("unit")}
              emptyMessage={tAnalytics("category.empty")}
              hrefByKey={categoryHrefByKey}
            />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              {tAnalytics("country.title")}
            </h3>
            <StatsBarList
              rows={countryRows}
              unitLabel={tStats("unit")}
              emptyMessage={tAnalytics("country.empty")}
              hrefByKey={countryHrefByKey}
            />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              {tAnalytics("aging.title")}
            </h3>
            <StatsBarList
              rows={agingRows}
              unitLabel={tStats("unit")}
              emptyMessage={tAnalytics("aging.empty")}
              hrefByKey={agingHrefByKey}
            />
            {stats.oldestUnclaimedHours !== null && (
              <p className="mt-2 text-xs text-muted-foreground">
                {tAnalytics("aging.oldest", {
                  hours: Math.floor(stats.oldestUnclaimedHours),
                })}
              </p>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              {tAnalytics("intake.receivedTitle")}
            </h3>
            <IntakeTrendBarChart
              columns={intakeColumns}
              locale={locale}
              unitLabel={tStats("unit")}
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
 * `HelpdeskInquiryKpiPanel` のデータ取得中に表示するSuspenseフォールバック。
 */
export function HelpdeskInquiryKpiPanelSkeleton() {
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
