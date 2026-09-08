"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  toStaffLoadRows,
  toStatusSegments,
  type HelpdeskInquiryStats,
} from "@/lib/helpdesk-inquiry-stats";
import { StaffLoadBarList } from "@/components/features/helpdesk-inquiries/StaffLoadBarList";
import { StatusBreakdownBar } from "@/components/features/helpdesk-inquiries/StatusBreakdownBar";
import type { Inquiry } from "@/types/inquiry";

export interface HelpdeskInquiryStatsPanelProps {
  stats: HelpdeskInquiryStats;
  statusLabels: Record<Inquiry["status"], string>;
  /** フィルタ適用後に表示されている件数（stats.totalと同じ） */
  shown: number;
  /** フィルタ適用前の全件数。shownと異なる場合のみ「絞り込み中」の注記を出す */
  total: number;
}

/**
 * ヘルプデスク側問い合わせ一覧の右側に置く対応状況サマリパネル。
 * 現在表示中の一覧（フィルタ適用後）に対する集計値を表示するため、
 * 一覧側のフィルタ状態と常に一致する（別々に集計しない）。
 */
export function HelpdeskInquiryStatsPanel({
  stats,
  statusLabels,
  shown,
  total,
}: HelpdeskInquiryStatsPanelProps) {
  const t = useTranslations("helpdeskInquiries.stats");

  const statusSegments = toStatusSegments(stats.byStatus, stats.total);
  const staffLoadRows = toStaffLoadRows(stats);

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
          <p className="text-5xl font-semibold text-foreground">
            {stats.unclaimed}
          </p>
          {stats.unclaimed === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("unclaimedNone")}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("unclaimedCaption")}
            </p>
          )}
          {stats.unclaimedHighUrgency > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {t("highUrgencyAlert", { count: stats.unclaimedHighUrgency })}
            </p>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            {t("statusBreakdownTitle")}
          </h3>
          <StatusBreakdownBar segments={statusSegments} statusLabels={statusLabels} />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            {t("staffLoadTitle")}
          </h3>
          <StaffLoadBarList rows={staffLoadRows} />
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
            </tbody>
          </table>
        </details>
      </CardContent>
    </Card>
  );
}
