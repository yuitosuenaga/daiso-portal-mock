import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllAnnouncements } from "@/lib/api/announcements";
import { getAnnouncementRecipientStatuses } from "@/lib/api/announcement-tracking";
import { ANNOUNCEMENT_CATEGORY_CODES } from "@/lib/constants/announcement-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { AnnouncementManagementListClient } from "@/components/features/helpdesk-announcements/AnnouncementManagementListClient";
import type { Announcement, AnnouncementCategory } from "@/types/announcement";
import type { AnnouncementRecipientStatusView } from "@/types/announcement-recipient";

export async function AnnouncementManagementList() {
  const [t, tCategories, tCountries, locale] = await Promise.all([
    getTranslations("helpdeskAnnouncements.list"),
    getTranslations("announcements.categories"),
    getTranslations("inquiryForm.options.country"),
    getLocale(),
  ]);

  const heading = (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <Link
        href="/helpdesk/announcements/new"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t("addButton")}
      </Link>
    </div>
  );

  let announcements: Announcement[];
  try {
    announcements = await getAllAnnouncements();
  } catch {
    return (
      <div>
        {heading}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("error")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div>
        {heading}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categoryLabels = ANNOUNCEMENT_CATEGORY_CODES.reduce(
    (labels, code) => {
      labels[code] = tCategories(code);
      return labels;
    },
    {} as Record<AnnouncementCategory, string>
  );

  const countryLabels = INQUIRY_COUNTRY_CODES.reduce(
    (labels, code) => {
      labels[code] = tCountries(code);
      return labels;
    },
    {} as Record<string, string>
  );

  const categoryOptions = ANNOUNCEMENT_CATEGORY_CODES.map((code) => ({
    value: code,
    label: tCategories(code),
  }));

  const recipientStatusesEntries = await Promise.all(
    announcements.map(
      async (announcement) =>
        [
          announcement.id,
          await getAnnouncementRecipientStatuses(announcement.id),
        ] as const
    )
  );
  const recipientStatusesByAnnouncementId: Record<
    string,
    AnnouncementRecipientStatusView[]
  > = Object.fromEntries(recipientStatusesEntries);

  return (
    <div>
      {heading}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementManagementListClient
            announcements={announcements}
            categoryLabels={categoryLabels}
            countryLabels={countryLabels}
            categoryOptions={categoryOptions}
            locale={locale}
            targetingAllLabel={t("targetingAllLabel")}
            targetingCountriesLabel={t("targetingCountriesLabel")}
            actionRequiredBadgeLabel={t("actionRequiredBadge")}
            statusBadgeDraftLabel={t("statusBadgeDraft")}
            publishPeriodAlwaysLabel={t("publishPeriodAlwaysLabel")}
            publishPeriodLabel={t("publishPeriodLabel")}
            publishPeriodToSeparator={t("publishPeriodToSeparator")}
            dueDateLabel={t("dueDateLabel")}
            editLinkLabel={t("editLink")}
            deleteButtonLabel={t("deleteButton")}
            deleteConfirmMessage={t("deleteConfirm")}
            deleteErrorMessage={t("deleteError")}
            recipientStatusesByAnnouncementId={recipientStatusesByAnnouncementId}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function AnnouncementManagementListSkeleton() {
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
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}
