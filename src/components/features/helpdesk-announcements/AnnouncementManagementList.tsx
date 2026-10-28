import { logLoadFailure } from "@/lib/server/load-failure";
import { getTranslations, getLocale } from "next-intl/server";
import { getAllAnnouncements } from "@/lib/api/announcements";
import { getAnnouncementTrackingStatusesBulk } from "@/lib/api/announcement-tracking";
import { triggerAutoEscalationBestEffort } from "@/lib/server/announcement-escalation";
import { ANNOUNCEMENT_CATEGORY_CODES } from "@/lib/constants/announcement-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { AnnouncementManagementListClient } from "@/components/features/helpdesk-announcements/AnnouncementManagementListClient";
import {
  ManagementListCard,
  ManagementListHeading,
  ManagementListMessageCard,
  ManagementListSkeleton,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { AnnouncementCategory, AnnouncementSummary } from "@/types/announcement";

export async function AnnouncementManagementList() {
  // 対応期限超過の自動エスカレーション（要件38）をアクセス時トリガーとしてベストエフォートで
  // 発火する。内部で例外を握りつぶすため、失敗しても以降の一覧取得・描画は継続する。
  await triggerAutoEscalationBestEffort();

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

  let announcements: AnnouncementSummary[];
  try {
    announcements = await getAllAnnouncements();
  } catch (error) {
    logLoadFailure("AnnouncementManagementList", error);
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

  // お知らせ件数に依存しない固定本数のクエリで、全お知らせ分の実施済み・確認済み状況をまとめて取得する。
  const {
    recipientStatuses: recipientStatusesByAnnouncementId,
    userReadStatuses: userReadStatusesByAnnouncementId,
  } = await getAnnouncementTrackingStatusesBulk(announcements);

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
          targetingUsersLabel={t.raw("targetingUsersLabel")}
          actionRequiredBadgeLabel={t("actionRequiredBadge")}
          statusBadgeDraftLabel={t("statusBadgeDraft")}
          publishPeriodAlwaysLabel={t("publishPeriodAlwaysLabel")}
          publishPeriodLabel={t("publishPeriodLabel")}
          publishPeriodToSeparator={t("publishPeriodToSeparator")}
          dueDateLabel={t("dueDateLabel")}
          editLinkLabel={t("editLink")}
          recipientStatusesByAnnouncementId={recipientStatusesByAnnouncementId}
          userReadStatusesByAnnouncementId={userReadStatusesByAnnouncementId}
        />
      </ManagementListCard>
    </div>
  );
}

export function AnnouncementManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
