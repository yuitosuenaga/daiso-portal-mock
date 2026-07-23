import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { getAllInquiries } from "@/lib/api/inquiries";
import { computeUnresolvedInquiriesKpi } from "@/lib/dashboard-unresolved-inquiries-kpi";
import type { UnresolvedInquiriesKpi } from "@/lib/dashboard-unresolved-inquiries-kpi";

export interface UnresolvedInquiriesKpiPanelProps {
  /** 問い合わせ一覧ページへの遷移先パス（例: "/helpdesk/inquiries"） */
  viewAllHref: string;
}

function KpiValue({ count, noneLabel }: { count: number; noneLabel: string }) {
  if (count === 0) {
    return (
      <p className="text-2xl font-semibold text-foreground">{noneLabel}</p>
    );
  }

  return <p className="text-4xl font-bold text-primary">{count}</p>;
}

/**
 * ヘルプデスク側ダッシュボードの最上部に配置する、全社の未対応件数KPI強調表示パネル。
 *
 * 全社の未対応（`status`が`new`または`in_progress`）件数と、そのうち本日受付分の件数を
 * 大きく強調表示し、問い合わせ一覧ページへの導線を提供する。
 * データ取得に失敗した場合は例外を上位へ伝播させず、パネル内にエラー状態を表示する。
 */
export async function UnresolvedInquiriesKpiPanel({
  viewAllHref,
}: UnresolvedInquiriesKpiPanelProps) {
  const t = await getTranslations("helpdeskDashboard.kpi");

  let kpi: UnresolvedInquiriesKpi | null = null;
  try {
    const inquiries = await getAllInquiries();
    kpi = computeUnresolvedInquiriesKpi(inquiries);
  } catch {
    kpi = null;
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {kpi === null ? (
          <p role="alert" className="text-sm text-destructive">
            {t("error")}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("unresolvedLabel")}
              </p>
              <KpiValue count={kpi.total} noneLabel={t("none")} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("todayLabel")}
              </p>
              <KpiValue count={kpi.today} noneLabel={t("none")} />
            </div>
          </div>
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
 * `UnresolvedInquiriesKpiPanel` のデータ取得中に表示するSuspenseフォールバック。
 */
export function UnresolvedInquiriesKpiPanelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-16" />
          </div>
        </div>
        <Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
}
