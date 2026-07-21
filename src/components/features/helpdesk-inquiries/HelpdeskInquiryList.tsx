import { getTranslations, getLocale } from "next-intl/server";
import { getAllInquiries } from "@/lib/api/inquiries";
import { sortInquiriesForHelpdesk } from "@/lib/helpdesk-inquiry-list";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  INQUIRY_CATEGORY_CODES,
  INQUIRY_COUNTRY_CODES,
  INQUIRY_STATUS_CODES,
  INQUIRY_URGENCY_CODES,
} from "@/lib/constants/inquiry-options";
import { HelpdeskInquiryListClient } from "@/components/features/helpdesk-inquiries/HelpdeskInquiryListClient";
import type { Inquiry } from "@/types/inquiry";

export async function HelpdeskInquiryList() {
  const [t, tOptions, tStatus, tClaim, locale] = await Promise.all([
    getTranslations("helpdeskInquiries.list"),
    getTranslations("inquiryForm.options"),
    getTranslations("inquiryList.status"),
    getTranslations("helpdeskInquiries.claim"),
    getLocale(),
  ]);

  const heading = (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
    </div>
  );

  let inquiries: Inquiry[];
  try {
    inquiries = await getAllInquiries();
  } catch {
    return (
      <div>
        {heading}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("error")}</p>
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
          <CardHeader>
            <CardTitle className="text-base">{t("title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedInquiries = sortInquiriesForHelpdesk(inquiries);

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
      labels[code] = tStatus(code);
      return labels;
    },
    {} as Record<Inquiry["status"], string>
  );

  const countryLabels = INQUIRY_COUNTRY_CODES.reduce(
    (labels, code) => {
      labels[code] = tOptions(`country.${code}`);
      return labels;
    },
    {} as Record<string, string>
  );

  const countryOptions = INQUIRY_COUNTRY_CODES.map((code) => ({
    value: code,
    label: countryLabels[code],
  }));

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
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <HelpdeskInquiryListClient
            inquiries={sortedInquiries}
            categoryLabels={categoryLabels}
            urgencyLabels={urgencyLabels}
            statusLabels={statusLabels}
            countryLabels={countryLabels}
            countryOptions={countryOptions}
            categoryOptions={categoryOptions}
            statusOptions={statusOptions}
            claimBadgeLabel={tClaim("inProgressBadge")}
            claimedByLabel={tClaim("claimedByLabel")}
            locale={locale}
            untitledLabel={t("untitled")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function HelpdeskInquiryListSkeleton() {
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
