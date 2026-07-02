import { getTranslations, getLocale } from "next-intl/server";
import { getInquiries } from "@/lib/api/inquiries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import {
  INQUIRY_CATEGORY_CODES,
  INQUIRY_URGENCY_CODES,
} from "@/lib/constants/inquiry-options";
import { InquiryListItem } from "@/components/features/inquiry-list/InquiryListItem";
import type { Inquiry } from "@/types/inquiry";

const RECENT_INQUIRIES_LIMIT = 5;

const INQUIRY_STATUS_CODES = [
  "new",
  "in_progress",
  "resolved",
] as const satisfies readonly Inquiry["status"][];

export async function RecentInquiriesWidget() {
  const [t, tOptions, tStatus, locale] = await Promise.all([
    getTranslations("dashboard.recentInquiries"),
    getTranslations("inquiryForm.options"),
    getTranslations("inquiryList"),
    getLocale(),
  ]);

  let inquiries: Inquiry[];
  try {
    inquiries = await getInquiries();
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

  const recentInquiries = inquiries.slice(0, RECENT_INQUIRIES_LIMIT);

  const categoryLabels = INQUIRY_CATEGORY_CODES.reduce(
    (labels, code) => {
      labels[code] = tOptions(`category.${code}`);
      return labels;
    },
    {} as Record<Inquiry["category"], string>
  );

  const urgencyLabels = INQUIRY_URGENCY_CODES.reduce(
    (labels, code) => {
      labels[code] = tOptions(`urgency.${code}`);
      return labels;
    },
    {} as Record<Inquiry["urgency"], string>
  );

  const statusLabels = INQUIRY_STATUS_CODES.reduce(
    (labels, code) => {
      labels[code] = tStatus(`status.${code}`);
      return labels;
    },
    {} as Record<Inquiry["status"], string>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {recentInquiries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentInquiries.map((item) => (
              <InquiryListItem
                key={item.id}
                inquiry={item}
                categoryLabel={categoryLabels[item.category]}
                urgencyLabel={urgencyLabels[item.urgency]}
                statusLabel={statusLabels[item.status]}
                statusFieldLabel={tStatus("detail.statusLabel")}
                urgencyFieldLabel={tStatus("detail.urgencyLabel")}
                locale={locale}
              />
            ))}
          </ul>
        )}
        <Link
          href="/inquiry"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          {t("viewAll")}
        </Link>
      </CardContent>
    </Card>
  );
}

export function RecentInquiriesWidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}
