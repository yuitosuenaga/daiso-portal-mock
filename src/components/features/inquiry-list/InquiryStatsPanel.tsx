"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toStatusSegments } from "@/lib/helpdesk-inquiry-stats";
import { toUrgencyRows, type ApplicantInquiryStats } from "@/lib/inquiry-stats";
import type { InquiryFilters } from "@/lib/inquiry-filter";
import { StatusBreakdownBar } from "@/components/features/inquiry-stats/StatusBreakdownBar";
import { UrgencyBreakdownBarList } from "@/components/features/inquiry-stats/UrgencyBreakdownBarList";
import { cn } from "@/lib/utils";
import type { Inquiry } from "@/types/inquiry";

export interface InquiryStatsPanelProps {
  stats: ApplicantInquiryStats;
  statusLabels: Record<Inquiry["status"], string>;
  urgencyLabels: Record<Inquiry["urgency"], string>;
  /** フィルタ適用後に表示されている件数（stats.totalと同じ） */
  shown: number;
  /** フィルタ適用前の全件数。shownと異なる場合のみ「絞り込み中」の注記を出す */
  total: number;
  /** 現在一覧に適用されているフィルタ条件。各項目の選択状態表示に使う */
  filters: InquiryFilters;
  /**
   * 指定すると各項目がクリック可能になり、クリックした条件で一覧を絞り込めるようになる
   * （呼び出し元で同一条件の再クリックをトグル解除として扱う想定）。
   */
  onFilterChange?: (patch: Partial<InquiryFilters>) => void;
}

/**
 * 申請者側問い合わせ一覧の右側に置く対応状況サマリパネル。
 * 現在表示中の一覧（フィルタ適用後）に対する集計値を表示するため、
 * 一覧側のフィルタ状態と常に一致する（別々に集計しない）。
 */
export function InquiryStatsPanel({
  stats,
  statusLabels,
  urgencyLabels,
  shown,
  total,
  filters,
  onFilterChange,
}: InquiryStatsPanelProps) {
  const t = useTranslations("inquiryList.stats");

  const statusSegments = toStatusSegments(stats.byStatus, stats.total);
  const urgencyRows = toUrgencyRows(stats);

  const unreadSelected = filters.unreadOnly;
  const highUrgencySelected = filters.urgency === "high";
  const awaitingResponseSelected = filters.status === "new";

  return (
    <Card>
      <CardHeader>
        <CardTitle id="inquiry-stats-heading" className="text-base">
          {t("title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {shown === total ? t("scopeAll") : t("scopeFiltered", { count: shown })}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-xs text-muted-foreground">{t("unreadLabel")}</p>
          {onFilterChange ? (
            <button
              type="button"
              aria-pressed={unreadSelected}
              onClick={() =>
                onFilterChange({ unreadOnly: !unreadSelected })
              }
              className={cn(
                "-mx-1 rounded-md px-1 text-left hover:bg-muted/60",
                unreadSelected && "bg-accent"
              )}
            >
              <p className="text-5xl font-semibold text-foreground">
                {stats.unread}
              </p>
            </button>
          ) : (
            <p className="text-5xl font-semibold text-foreground">
              {stats.unread}
            </p>
          )}
          {stats.unread === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("unreadNone")}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("unreadCaption")}
            </p>
          )}
          {stats.highUrgencyUnresolved > 0 &&
            (onFilterChange ? (
              <button
                type="button"
                aria-pressed={highUrgencySelected}
                onClick={() =>
                  onFilterChange({
                    urgency: highUrgencySelected ? "" : "high",
                  })
                }
                className={cn(
                  "mt-2 flex w-full items-center gap-1.5 rounded-md text-left text-xs text-destructive hover:underline",
                  highUrgencySelected && "font-semibold"
                )}
              >
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {t("highUrgencyAlert", { count: stats.highUrgencyUnresolved })}
              </button>
            ) : (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {t("highUrgencyAlert", { count: stats.highUrgencyUnresolved })}
              </p>
            ))}
        </div>

        <div>
          <p className="text-xs text-muted-foreground">
            {t("awaitingResponseLabel")}
          </p>
          {onFilterChange ? (
            <button
              type="button"
              aria-pressed={awaitingResponseSelected}
              onClick={() =>
                onFilterChange({
                  status: awaitingResponseSelected ? "" : "new",
                })
              }
              className={cn(
                "-mx-1 rounded-md px-1 text-left hover:bg-muted/60",
                awaitingResponseSelected && "bg-accent"
              )}
            >
              <p className="text-2xl font-semibold text-foreground">
                {stats.awaitingResponse}
              </p>
            </button>
          ) : (
            <p className="text-2xl font-semibold text-foreground">
              {stats.awaitingResponse}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {t("awaitingResponseCaption")}
          </p>
        </div>

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
                ? (status) =>
                    onFilterChange({ status: filters.status === status ? "" : status })
                : undefined
            }
          />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            {t("urgencyBreakdownTitle")}
          </h3>
          <UrgencyBreakdownBarList
            rows={urgencyRows}
            urgencyLabels={urgencyLabels}
            unitLabel={t("unit")}
            emptyMessage={t("urgencyBreakdownEmpty")}
            selectedUrgency={filters.urgency || null}
            onSelect={
              onFilterChange
                ? (urgency) =>
                    onFilterChange({
                      urgency: filters.urgency === urgency ? "" : urgency,
                    })
                : undefined
            }
          />
        </div>

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
              {urgencyRows.map((row) => (
                <tr key={row.urgency} className="border-b border-border/60">
                  <td className="py-1 text-foreground">
                    {urgencyLabels[row.urgency]}
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
            </tbody>
          </table>
        </details>
      </CardContent>
    </Card>
  );
}
