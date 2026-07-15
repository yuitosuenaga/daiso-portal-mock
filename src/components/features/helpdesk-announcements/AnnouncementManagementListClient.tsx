"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import type { SelectOption } from "@/components/ui/select";
import {
  EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS,
  filterAnnouncementsForHelpdesk,
} from "@/lib/helpdesk-announcement-list";
import { AnnouncementFilterBar } from "@/components/features/helpdesk-announcements/AnnouncementFilterBar";
import { DeleteAnnouncementButton } from "@/components/features/helpdesk-announcements/DeleteAnnouncementButton";
import { AnnouncementTrackingBadge } from "@/components/features/helpdesk-announcements/AnnouncementTrackingBadge";
import {
  ManagementListRow,
  ManagementListRows,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { Announcement, AnnouncementCategory } from "@/types/announcement";
import type { AnnouncementRecipientStatusView } from "@/types/announcement-recipient";

export interface AnnouncementManagementListClientProps {
  /** 公開日降順で整列済みの全お知らせ */
  announcements: Announcement[];
  categoryLabels: Record<AnnouncementCategory, string>;
  countryLabels: Record<string, string>;
  categoryOptions: SelectOption[];
  locale: string;
  targetingAllLabel: string;
  targetingCountriesLabel: string;
  actionRequiredBadgeLabel: string;
  statusBadgeDraftLabel: string;
  publishPeriodAlwaysLabel: string;
  publishPeriodLabel: string;
  publishPeriodToSeparator: string;
  dueDateLabel: string;
  editLinkLabel: string;
  deleteButtonLabel: string;
  deleteConfirmMessage: string;
  deleteErrorMessage: string;
  /** お知らせIDごとの担当者別確認済み・実施済み・リマインド送信状態 */
  recipientStatusesByAnnouncementId: Record<string, AnnouncementRecipientStatusView[]>;
}

/**
 * フィルタ条件の状態を保持し、`AnnouncementFilterBar` と絞り込み済み一覧を
 * クライアント側で結線するコンポーネント。
 */
export function AnnouncementManagementListClient({
  announcements,
  categoryLabels,
  countryLabels,
  categoryOptions,
  locale,
  targetingAllLabel,
  targetingCountriesLabel,
  actionRequiredBadgeLabel,
  statusBadgeDraftLabel,
  publishPeriodAlwaysLabel,
  publishPeriodLabel,
  publishPeriodToSeparator,
  dueDateLabel,
  editLinkLabel,
  deleteButtonLabel,
  deleteConfirmMessage,
  deleteErrorMessage,
  recipientStatusesByAnnouncementId,
}: AnnouncementManagementListClientProps) {
  const t = useTranslations("helpdeskAnnouncements.list.filter");
  const [filters, setFilters] = useState(EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS);

  const filteredAnnouncements = useMemo(
    () => filterAnnouncementsForHelpdesk(announcements, filters),
    [announcements, filters]
  );

  function targetingLabel(announcement: Announcement): string {
    if (announcement.targeting.scope === "all") {
      return targetingAllLabel;
    }
    return `${targetingCountriesLabel}: ${announcement.targeting.countries
      .map((code) => countryLabels[code] ?? code)
      .join(", ")}`;
  }

  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function publishPeriodText(announcement: Announcement): string {
    const { publishStartDate, publishEndDate } = announcement;
    if (!publishStartDate && !publishEndDate) {
      return publishPeriodAlwaysLabel;
    }
    const start = publishStartDate ? formatDate(publishStartDate) : "";
    const end = publishEndDate ? formatDate(publishEndDate) : "";
    return `${publishPeriodLabel}: ${start} ${publishPeriodToSeparator} ${end}`.trim();
  }

  return (
    <div className="space-y-4">
      <AnnouncementFilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_HELPDESK_ANNOUNCEMENT_FILTERS)}
        categoryOptions={categoryOptions}
      />
      {filteredAnnouncements.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <ManagementListRows>
          {filteredAnnouncements.map((announcement) => (
            <ManagementListRow key={announcement.id}>
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{announcement.title}</p>
                  {announcement.status === "draft" && (
                    <Badge variant="muted">{statusBadgeDraftLabel}</Badge>
                  )}
                  {announcement.actionRequired && (
                    <Badge variant="default">{actionRequiredBadgeLabel}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{categoryLabels[announcement.category]}</span>
                  {announcement.publishedAt ? (
                    <time dateTime={announcement.publishedAt}>
                      {new Date(announcement.publishedAt).toLocaleDateString(
                        locale,
                        { year: "numeric", month: "short", day: "numeric" }
                      )}
                    </time>
                  ) : (
                    <span>—</span>
                  )}
                  <span>{targetingLabel(announcement)}</span>
                  <span>{publishPeriodText(announcement)}</span>
                  {announcement.actionRequired && announcement.dueDate && (
                    <span>
                      {dueDateLabel}: {formatDate(announcement.dueDate)}
                    </span>
                  )}
                </div>
                {announcement.status === "published" && (
                  <AnnouncementTrackingBadge
                    announcementId={announcement.id}
                    actionRequired={announcement.actionRequired}
                    recipientStatuses={
                      recipientStatusesByAnnouncementId[announcement.id] ?? []
                    }
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/helpdesk/announcements/${announcement.id}/edit`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {editLinkLabel}
                </Link>
                <DeleteAnnouncementButton
                  announcementId={announcement.id}
                  deleteButtonLabel={deleteButtonLabel}
                  confirmMessage={deleteConfirmMessage}
                  errorMessage={deleteErrorMessage}
                />
              </div>
            </ManagementListRow>
          ))}
        </ManagementListRows>
      )}
    </div>
  );
}
