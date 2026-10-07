import { AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { getAllInquiries } from "@/lib/api/inquiries";
import { getCurrentHelpdeskStaffName } from "@/lib/api/current-staff";
import {
  computeHelpdeskInquiryStats,
  toStatusSegments,
  type HelpdeskInquiryStats,
} from "@/lib/helpdesk-inquiry-stats";
import { buildHelpdeskInquiryListHref } from "@/lib/helpdesk-inquiry-filter-query";
import { toReferenceDateKey } from "@/lib/reference-date";
import { StatsMetricTile } from "@/components/features/inquiry-stats/StatsMetricTile";
import { StatusBreakdownBar } from "@/components/features/inquiry-stats/StatusBreakdownBar";

export interface HelpdeskInquiryKpiPanelProps {
  /** 問い合わせ一覧ページへの遷移先パス（例: "/helpdesk/inquiries"） */
  listHref: string;
}

/**
 * ヘルプデスク側ダッシュボードの最上部に配置するKPIパネル（件数タイル・警告・ステータス内訳のみ。カテゴリ/国/経過時間/受付推移などの詳細は一覧画面のサマリで確認する）。
 * 一覧画面のサマリパネル（`HelpdeskInquiryStatsPanel`）と同じ集計関数
 * （`computeHelpdeskInquiryStats`）を使い、フィルタ前の全件を渡すことで
 * 「一覧画面のフィルタなし状態と同じ数値」を表示し、両画面の数値の一貫性を保つ。
 * 各要素は一覧画面への絞り込み付きリンクになる（`buildHelpdeskInquiryListHref`）。
 * データ取得に失敗した場合は例外を上位へ伝播させず、パネル内にエラー状態を表示する。
 */
export async function HelpdeskInquiryKpiPanel({
  listHref,
}: HelpdeskInquiryKpiPanelProps) {
  const [t, tStats, tStatus] = await Promise.all([
    getTranslations("helpdeskDashboard.kpi"),
    getTranslations("helpdeskInquiries.stats"),
    getTranslations("inquiryList.status"),
  ]);

  let stats: HelpdeskInquiryStats | null = null;
  let currentStaffName: string | null = null;
  const referenceDate = new Date();
  try {
    const [inquiries, staffName] = await Promise.all([
      getAllInquiries(),
      // 自分の担当タイルは付加的な情報であり、取得に失敗してもKPIパネル全体は表示を継続する。
      getCurrentHelpdeskStaffName().catch(() => null),
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

  const statusLabels = {
    new: tStatus("new"),
    in_progress: tStatus("in_progress"),
    resolved: tStatus("resolved"),
  } as const;

  const statusSegments = toStatusSegments(stats.byStatus, stats.total);
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
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

        <div className="grid gap-6">
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
        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-16" />
            </div>
          ))}
        </div>
        <div className="grid gap-6">
          {Array.from({ length: 1 }, (_, index) => (
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
