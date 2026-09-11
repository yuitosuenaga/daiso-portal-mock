"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  toStaffLoadRows,
  toStatusSegments,
  type HelpdeskInquiryStats,
} from "@/lib/helpdesk-inquiry-stats";
import type { HelpdeskInquiryFilters } from "@/lib/helpdesk-inquiry-list";
import {
  toAgingBarRows,
  toCategoryBarRows,
  toCountryBarRows,
} from "@/lib/inquiry-breakdown";
import { formatIntakeDateLabel, toIntakeTrendColumns } from "@/lib/inquiry-intake-trend";
import { INQUIRY_AGING_BUCKETS, type InquiryAgingBucket } from "@/lib/inquiry-aging";
import { StaffLoadBarList } from "@/components/features/helpdesk-inquiries/StaffLoadBarList";
import { StatusBreakdownBar } from "@/components/features/inquiry-stats/StatusBreakdownBar";
import { StatsBarList } from "@/components/features/inquiry-stats/StatsBarList";
import { StatsMetricTile } from "@/components/features/inquiry-stats/StatsMetricTile";
import { IntakeTrendBarChart } from "@/components/features/inquiry-stats/IntakeTrendBarChart";
import { cn } from "@/lib/utils";
import type { Inquiry } from "@/types/inquiry";

export interface HelpdeskInquiryStatsPanelProps {
  stats: HelpdeskInquiryStats;
  statusLabels: Record<Inquiry["status"], string>;
  categoryLabels: Record<Inquiry["category"], string>;
  countryLabels: Record<string, string>;
  locale: string;
  /** ログイン中ヘルプデスク担当者の表示名。「自分の担当」タイルの表示判定に使う */
  currentStaffName?: string | null;
  /** フィルタ適用後に表示されている件数（stats.totalと同じ） */
  shown: number;
  /** フィルタ適用前の全件数。shownと異なる場合のみ「絞り込み中」の注記を出す */
  total: number;
  /** 現在一覧に適用されているフィルタ条件。各項目の選択状態表示に使う */
  filters: HelpdeskInquiryFilters;
  /**
   * 指定すると各項目がクリック可能になり、クリックした条件で一覧を絞り込めるようになる
   * （呼び出し元で同一条件の再クリックをトグル解除として扱う想定）。
   */
  onFilterChange?: (patch: Partial<HelpdeskInquiryFilters>) => void;
}

const AGING_BUCKET_LABEL_KEY: Record<InquiryAgingBucket, string> = {
  lt24h: "aging.lt24h",
  h24to72: "aging.h24to72",
  d3to7: "aging.d3to7",
  gte7d: "aging.gte7d",
};

/**
 * ヘルプデスク側問い合わせ一覧の右側に置く対応状況サマリパネル。
 * 現在表示中の一覧（フィルタ適用後）に対する集計値を表示するため、
 * 一覧側のフィルタ状態と常に一致する（別々に集計しない）。
 */
export function HelpdeskInquiryStatsPanel({
  stats,
  statusLabels,
  categoryLabels,
  countryLabels,
  locale,
  currentStaffName,
  shown,
  total,
  filters,
  onFilterChange,
}: HelpdeskInquiryStatsPanelProps) {
  const t = useTranslations("helpdeskInquiries.stats");
  const tAnalytics = useTranslations("inquiryAnalytics");

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
  const agingLabels: Record<InquiryAgingBucket, string> = INQUIRY_AGING_BUCKETS.reduce(
    (labels, bucket) => {
      labels[bucket] = tAnalytics(AGING_BUCKET_LABEL_KEY[bucket]);
      return labels;
    },
    {} as Record<InquiryAgingBucket, string>
  );
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

  // normalizeHelpdeskInquiryFiltersが「unclaimedOnly・aging・countryのいずれかが
  // 有効ならunresolvedOnlyも常にtrue」を保証するため、これらに関する選択状態判定では
  // unresolvedOnlyの別チェックは不要（filters自体が単一の真実源として常に整合している）。
  // ただし`claimedBy`はこの保証の対象外（対応者による絞り込みは対応状況を問わず
  // 意味を持つ操作のため）なので、「自分の担当」タイルの選択判定は自身の
  // 複合パッチ（claimedBy・unresolvedOnly）と一致するかを個別に確認する。
  const unclaimedSelected = filters.unclaimedOnly && !filters.urgency && filters.aging === "";
  const highUrgencyAlertSelected =
    filters.unclaimedOnly && filters.urgency === "high" && filters.aging === "";
  const staleUnclaimedSelected = filters.unclaimedOnly && filters.aging === "over24h";
  const mineSelected =
    Boolean(currentStaffName) &&
    filters.claimedBy === currentStaffName &&
    filters.unresolvedOnly;
  const staffLoadSelectedKey = filters.unclaimedOnly
    ? "unclaimed"
    : filters.claimedBy
      ? `staff:${filters.claimedBy}`
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle id="helpdesk-inquiry-stats-heading" className="text-base">
          {t("title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {shown === total ? t("scopeAll") : t("scopeFiltered", { count: shown })}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-xs text-muted-foreground">{t("unclaimedLabel")}</p>
          {onFilterChange ? (
            <button
              type="button"
              aria-pressed={unclaimedSelected}
              onClick={() =>
                onFilterChange({
                  unclaimedOnly: true,
                  unresolvedOnly: true,
                  urgency: "",
                  aging: "",
                  // claim===nullとclaim.staffName===Xは両立しないため、対応者絞り込みを解除する。
                  claimedBy: "",
                })
              }
              className={cn(
                "-mx-1 rounded-md px-1 text-left hover:bg-muted/60",
                unclaimedSelected && "bg-accent"
              )}
            >
              <p className="text-5xl font-semibold text-foreground">
                {stats.unclaimed}
              </p>
            </button>
          ) : (
            <p className="text-5xl font-semibold text-foreground">
              {stats.unclaimed}
            </p>
          )}
          {stats.unclaimed === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("unclaimedNone")}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("unclaimedCaption")}
            </p>
          )}
          {stats.unclaimedHighUrgency > 0 &&
            (onFilterChange ? (
              <button
                type="button"
                aria-pressed={highUrgencyAlertSelected}
                onClick={() =>
                  onFilterChange({
                    unclaimedOnly: true,
                    unresolvedOnly: true,
                    urgency: "high",
                    aging: "",
                    claimedBy: "",
                  })
                }
                className={cn(
                  "mt-2 flex w-full items-center gap-1.5 rounded-md text-left text-xs text-destructive hover:underline",
                  highUrgencyAlertSelected && "font-semibold"
                )}
              >
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {t("highUrgencyAlert", { count: stats.unclaimedHighUrgency })}
              </button>
            ) : (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {t("highUrgencyAlert", { count: stats.unclaimedHighUrgency })}
              </p>
            ))}
          {stats.staleUnclaimed > 0 &&
            (onFilterChange ? (
              <button
                type="button"
                aria-pressed={staleUnclaimedSelected}
                onClick={() =>
                  onFilterChange({
                    unclaimedOnly: true,
                    unresolvedOnly: true,
                    urgency: "",
                    aging: "over24h",
                    claimedBy: "",
                  })
                }
                className={cn(
                  "mt-2 flex w-full items-center gap-1.5 rounded-md text-left text-xs text-destructive hover:underline",
                  staleUnclaimedSelected && "font-semibold"
                )}
              >
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {t("staleUnclaimedAlert", { count: stats.staleUnclaimed })}
              </button>
            ) : (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {t("staleUnclaimedAlert", { count: stats.staleUnclaimed })}
              </p>
            ))}
        </div>

        {currentStaffName && (
          <div>
            <StatsMetricTile
              label={t("mineLabel")}
              value={stats.mine}
              caption={t("mineCaption")}
              size="secondary"
              selected={mineSelected}
              onSelect={
                onFilterChange
                  ? () =>
                      onFilterChange({
                        claimedBy: currentStaffName,
                        unresolvedOnly: true,
                        // claim.staffName===Xとclaim===nullは両立しないため、未着手絞り込みを解除する。
                        unclaimedOnly: false,
                      })
                  : undefined
              }
            />
          </div>
        )}

        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            {t("statusBreakdownTitle")}
          </h3>
          <StatusBreakdownBar
            segments={statusSegments}
            statusLabels={statusLabels}
            unitLabel={t("unit")}
            selectedStatus={filters.status || null}
            onSelect={
              onFilterChange
                ? (status) => {
                    const nextStatus = filters.status === status ? "" : status;
                    onFilterChange({
                      status: nextStatus,
                      // resolvedはunresolvedOnly(new/in_progressのみ)と両立しないため、
                      // resolvedを選ぶ場合はunresolvedOnlyを解除して一覧が無言で空にならないようにする。
                      unresolvedOnly:
                        nextStatus === "resolved" ? false : filters.unresolvedOnly,
                    });
                  }
                : undefined
            }
          />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            {t("staffLoadTitle")}
          </h3>
          <StaffLoadBarList
            rows={staffLoadRows}
            selectedKey={staffLoadSelectedKey}
            onSelectRow={
              onFilterChange
                ? (row) => {
                    if (row.kind === "unclaimed") {
                      onFilterChange({
                        unclaimedOnly: true,
                        unresolvedOnly: true,
                        urgency: "",
                        aging: "",
                        claimedBy: "",
                      });
                    } else if (row.kind === "staff" && row.label) {
                      onFilterChange({
                        claimedBy: row.label,
                        unresolvedOnly: true,
                        unclaimedOnly: false,
                      });
                    }
                  }
                : undefined
            }
          />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            {tAnalytics("category.title")}
          </h3>
          <StatsBarList
            rows={categoryRows}
            unitLabel={t("unit")}
            emptyMessage={tAnalytics("category.empty")}
            selectedKey={filters.category || null}
            onSelectKey={
              onFilterChange
                ? (category) => onFilterChange({ category })
                : undefined
            }
          />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            {tAnalytics("country.title")}
          </h3>
          <StatsBarList
            rows={countryRows}
            unitLabel={t("unit")}
            emptyMessage={tAnalytics("country.empty")}
            selectedKey={filters.country || null}
            onSelectKey={
              onFilterChange
                ? (country) => {
                    if (country === "others") {
                      return;
                    }
                    onFilterChange({ country, unresolvedOnly: true });
                  }
                : undefined
            }
          />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            {tAnalytics("aging.title")}
          </h3>
          <StatsBarList
            rows={agingRows}
            unitLabel={t("unit")}
            emptyMessage={tAnalytics("aging.empty")}
            selectedKey={filters.aging || null}
            onSelectKey={
              onFilterChange
                ? (aging) =>
                    onFilterChange({
                      aging: aging as HelpdeskInquiryFilters["aging"],
                      unresolvedOnly: true,
                    })
                : undefined
            }
          />
          {stats.oldestUnclaimedHours !== null && (
            <p className="mt-2 text-xs text-muted-foreground">
              {tAnalytics("aging.oldest", {
                hours: Math.floor(stats.oldestUnclaimedHours),
              })}
            </p>
          )}
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            {tAnalytics("intake.receivedTitle")}
          </summary>
          <div className="mt-2">
            <IntakeTrendBarChart
              columns={intakeColumns}
              locale={locale}
              unitLabel={t("unit")}
              emptyMessage={tAnalytics("intake.empty")}
              ariaLabelByDateKey={intakeAriaLabelByDateKey}
              selectedDateKey={filters.receivedOn || null}
              onSelectDateKey={
                onFilterChange
                  ? (dateKey) => onFilterChange({ receivedOn: dateKey })
                  : undefined
              }
            />
          </div>
        </details>

        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            {t("tableToggle")}
          </summary>
          <table className="mt-2 w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1 font-medium">{t("tableHeaderItem")}</th>
                <th className="py-1 text-right font-medium">
                  {t("tableHeaderCount")}
                </th>
                <th className="py-1 text-right font-medium">
                  {t("tableHeaderShare")}
                </th>
              </tr>
            </thead>
            <tbody>
              {statusSegments.map((segment) => (
                <tr key={segment.status} className="border-b border-border/60">
                  <td className="py-1 text-foreground">
                    {statusLabels[segment.status]}
                  </td>
                  <td className="py-1 text-right tabular-nums text-foreground">
                    {segment.count}
                  </td>
                  <td className="py-1 text-right tabular-nums text-muted-foreground">
                    {t("percent", { value: segment.percent })}
                  </td>
                </tr>
              ))}
              {staffLoadRows.map((row) => (
                <tr key={row.key} className="border-b border-border/60">
                  <td className="py-1 text-foreground">
                    {row.kind === "unclaimed"
                      ? t("unclaimedLabel")
                      : row.kind === "others"
                        ? t("staffOthers", { count: row.staffCount ?? 0 })
                        : row.label}
                  </td>
                  <td className="py-1 text-right tabular-nums text-foreground">
                    {row.count}
                  </td>
                  <td className="py-1 text-right tabular-nums text-muted-foreground">
                    {stats.total > 0
                      ? t("percent", {
                          value: Math.round((row.count / stats.total) * 100),
                        })
                      : t("percent", { value: 0 })}
                  </td>
                </tr>
              ))}
              {categoryRows.map((row) => (
                <tr key={row.key} className="border-b border-border/60">
                  <td className="py-1 text-foreground">{row.label}</td>
                  <td className="py-1 text-right tabular-nums text-foreground">
                    {row.count}
                  </td>
                  <td className="py-1 text-right tabular-nums text-muted-foreground">
                    {stats.total > 0
                      ? t("percent", {
                          value: Math.round((row.count / stats.total) * 100),
                        })
                      : t("percent", { value: 0 })}
                  </td>
                </tr>
              ))}
              {countryRows.map((row) => (
                <tr key={row.key} className="border-b border-border/60">
                  <td className="py-1 text-foreground">{row.label}</td>
                  <td className="py-1 text-right tabular-nums text-foreground">
                    {row.count}
                  </td>
                  <td className="py-1 text-right tabular-nums text-muted-foreground">
                    {stats.unresolved > 0
                      ? t("percent", {
                          value: Math.round((row.count / stats.unresolved) * 100),
                        })
                      : t("percent", { value: 0 })}
                  </td>
                </tr>
              ))}
              {agingRows.map((row) => (
                <tr key={row.key} className="border-b border-border/60">
                  <td className="py-1 text-foreground">{row.label}</td>
                  <td className="py-1 text-right tabular-nums text-foreground">
                    {row.count}
                  </td>
                  <td className="py-1 text-right tabular-nums text-muted-foreground">
                    {stats.unresolved > 0
                      ? t("percent", {
                          value: Math.round((row.count / stats.unresolved) * 100),
                        })
                      : t("percent", { value: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </CardContent>
    </Card>
  );
}
