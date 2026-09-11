import { getTranslations, getLocale } from "next-intl/server";
import { getAllInquiries } from "@/lib/api/inquiries";
import { getCurrentHelpdeskStaffName } from "@/lib/api/current-staff";
import { sortInquiriesForHelpdesk } from "@/lib/helpdesk-inquiry-list";
import {
  helpdeskInquiryFilterStateKey,
  parseHelpdeskInquiryFilters,
} from "@/lib/helpdesk-inquiry-filter-query";
import type { InquiryListSearchParams } from "@/lib/inquiry-filter-query";
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

export async function HelpdeskInquiryList({
  searchParams,
}: {
  searchParams?: InquiryListSearchParams;
} = {}) {
  const initialFilters = parseHelpdeskInquiryFilters(searchParams);
  const nowIso = new Date().toISOString();

  const [t, tOptions, tStatus, tClaim, locale, currentStaffName] = await Promise.all([
    getTranslations("helpdeskInquiries.list"),
    getTranslations("inquiryForm.options"),
    getTranslations("inquiryList.status"),
    getTranslations("helpdeskInquiries.claim"),
    getLocale(),
    // 「自分の担当」絞り込みは付加的な情報であり、取得に失敗しても一覧表示自体は継続する。
    getCurrentHelpdeskStaffName().catch(() => null),
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

  const urgencyOptions = INQUIRY_URGENCY_CODES.map((code) => ({
    value: code,
    label: urgencyLabels[code],
  }));

  return (
    <div>
      {heading}
      <HelpdeskInquiryListClient
        key={helpdeskInquiryFilterStateKey(initialFilters)}
        inquiries={sortedInquiries}
        categoryLabels={categoryLabels}
        urgencyLabels={urgencyLabels}
        statusLabels={statusLabels}
        countryLabels={countryLabels}
        countryOptions={countryOptions}
        categoryOptions={categoryOptions}
        statusOptions={statusOptions}
        urgencyOptions={urgencyOptions}
        claimBadgeLabel={tClaim("inProgressBadge")}
        claimedByLabel={tClaim("claimedByLabel")}
        locale={locale}
        untitledLabel={t("untitled")}
        currentStaffName={currentStaffName}
        initialFilters={initialFilters}
        nowIso={nowIso}
      />
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
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-5">
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0 xl:order-1">
            <Card>
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
          <div className="xl:order-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
