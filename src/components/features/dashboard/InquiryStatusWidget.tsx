import { getTranslations } from "next-intl/server";
import { getInquiryStatusSummary } from "@/lib/api/inquiries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export async function InquiryStatusWidget() {
  const t = await getTranslations("dashboard.inquiryStatus");

  let summary;
  try {
    summary = await getInquiryStatusSummary();
  } catch {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("error")}</p>
        </CardContent>
      </Card>
    );
  }

  const statuses = [
    { key: "new", label: t("new"), count: summary.new },
    { key: "in_progress", label: t("inProgress"), count: summary.in_progress },
    { key: "resolved", label: t("resolved"), count: summary.resolved },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {statuses.map((status) => (
            <div
              key={status.key}
              className="flex flex-col items-center rounded-md bg-muted p-3 text-center"
            >
              <span className="text-2xl font-bold text-foreground">
                {status.count}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {status.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function InquiryStatusWidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-md" />
          <Skeleton className="h-20 rounded-md" />
          <Skeleton className="h-20 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}
