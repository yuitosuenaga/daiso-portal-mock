import { getTranslations, getLocale } from "next-intl/server";
import { getAllAnnouncements } from "@/lib/api/announcements";
import { getAnnouncementRecipientStatuses } from "@/lib/api/announcement-tracking";
import { ANNOUNCEMENT_CATEGORY_CODES } from "@/lib/constants/announcement-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { AnnouncementManagementListClient } from "@/components/features/helpdesk-announcements/AnnouncementManagementListClient";
import {
  ManagementListCard,
  ManagementListHeading,
  ManagementListMessageCard,
  ManagementListSkeleton,
} from "@/components/features/helpdesk-shared/ManagementList";
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
    <ManagementListHeading
      title={t("title")}
      description={t("description")}
      addHref="/helpdesk/announcements/new"
      addLabel={t("addButton")}
    />
  );

  let announcements: Announcement[];
  try {
    announcements = await getAllAnnouncements();
  } catch {
    return (
      <div>
        {heading}
        <ManagementListMessageCard message={t("error")} />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div>
        {heading}
        <ManagementListMessageCard message={t("empty")} />
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
      <ManagementListCard title={t("title")}>
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
          recipientStatusesByAnnouncementId={recipientStatusesByAnnouncementId}
        />
      </ManagementListCard>
    </div>
  );
}

export function AnnouncementManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
