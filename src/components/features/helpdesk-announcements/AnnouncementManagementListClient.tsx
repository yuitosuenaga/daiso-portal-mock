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
import type { Announcement, AnnouncementCategory } from "@/types/announcement";

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
  editLinkLabel: string;
  deleteButtonLabel: string;
  deleteConfirmMessage: string;
  deleteErrorMessage: string;
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
  editLinkLabel,
  deleteButtonLabel,
  deleteConfirmMessage,
  deleteErrorMessage,
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
        <ul className="divide-y divide-border">
          {filteredAnnouncements.map((announcement) => (
            <li
              key={announcement.id}
              className="flex items-start justify-between gap-4 py-3"
            >
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{announcement.title}</p>
                  {announcement.actionRequired && (
                    <Badge variant="default">{actionRequiredBadgeLabel}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{categoryLabels[announcement.category]}</span>
                  <time dateTime={announcement.publishedAt}>
                    {new Date(announcement.publishedAt).toLocaleDateString(
                      locale,
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                  </time>
                  <span>{targetingLabel(announcement)}</span>
                </div>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
