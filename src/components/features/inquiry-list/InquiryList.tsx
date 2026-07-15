import { getTranslations, getLocale } from "next-intl/server";
import { getInquiries } from "@/lib/api/inquiries";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  INQUIRY_CATEGORY_CODES,
  INQUIRY_URGENCY_CODES,
} from "@/lib/constants/inquiry-options";
import { InquiryListClient } from "@/components/features/inquiry-list/InquiryListClient";
import type { Inquiry } from "@/types/inquiry";

const INQUIRY_STATUS_CODES = [
  "new",
  "in_progress",
  "resolved",
] as const satisfies readonly Inquiry["status"][];

export async function InquiryList() {
  const [t, tOptions, locale] = await Promise.all([
    getTranslations("inquiryList"),
    getTranslations("inquiryForm.options"),
    getLocale(),
  ]);

  const heading = (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-foreground">
        {t("list.title")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("list.description")}
      </p>
    </div>
  );

  let inquiries: Inquiry[];
  try {
    inquiries = await getInquiries();
  } catch {
    return (
      <div>
        {heading}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("list.error")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div>
        {heading}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("list.empty")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      labels[code] = t(`status.${code}`);
      return labels;
    },
    {} as Record<Inquiry["status"], string>
  );

  const categoryOptions = INQUIRY_CATEGORY_CODES.map((code) => ({
    value: code,
    label: categoryLabels[code],
  }));

  const statusOptions = INQUIRY_STATUS_CODES.map((code) => ({
    value: code,
    label: statusLabels[code],
  }));

  return (
    <div>
      {heading}
      <Card>
        <CardContent className="pt-6">
          <InquiryListClient
            inquiries={inquiries}
            categoryLabels={categoryLabels}
            categoryOptions={categoryOptions}
            statusOptions={statusOptions}
            urgencyLabels={urgencyLabels}
            statusLabels={statusLabels}
            statusFieldLabel={t("detail.statusLabel")}
            urgencyFieldLabel={t("detail.urgencyLabel")}
            locale={locale}
            untitledLabel={t("list.untitled")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function InquiryListSkeleton() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}
