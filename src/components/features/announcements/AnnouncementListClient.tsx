"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { SelectOption } from "@/components/ui/select";
import {
  EMPTY_ANNOUNCEMENT_FILTERS,
  filterAnnouncements,
} from "@/lib/announcement-list";
import { AnnouncementFilterBar } from "@/components/features/announcements/AnnouncementFilterBar";
import { AnnouncementListItem } from "@/components/features/announcements/AnnouncementListItem";
import type { Announcement, AnnouncementCategory } from "@/types/announcement";

export interface AnnouncementListClientProps {
  /** 公開日降順・自社配信対象で整列済みのお知らせ */
  announcements: Announcement[];
  categoryLabels: Record<AnnouncementCategory, string>;
  categoryOptions: SelectOption[];
  actionRequiredBadgeLabel: string;
  /** お知らせIDごとの、自社宛リマインド受信有無 */
  reminderPendingByAnnouncementId: Record<string, boolean>;
  locale: string;
}

/**
 * フィルタ条件の状態を保持し、`AnnouncementFilterBar` と `AnnouncementListItem` の
 * 一覧をクライアント側で結線するコンポーネント。
 */
export function AnnouncementListClient({
  announcements,
  categoryLabels,
  categoryOptions,
  actionRequiredBadgeLabel,
  reminderPendingByAnnouncementId,
  locale,
}: AnnouncementListClientProps) {
  const t = useTranslations("announcements.list");
  const [filters, setFilters] = useState(EMPTY_ANNOUNCEMENT_FILTERS);

  const filteredAnnouncements = useMemo(
    () => filterAnnouncements(announcements, filters),
    [announcements, filters]
  );

  return (
    <div className="space-y-4">
      <AnnouncementFilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_ANNOUNCEMENT_FILTERS)}
        categoryOptions={categoryOptions}
      />
      {filteredAnnouncements.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {filteredAnnouncements.map((item) => (
            <AnnouncementListItem
              key={item.id}
              announcement={item}
              categoryLabel={categoryLabels[item.category]}
              actionRequiredBadgeLabel={actionRequiredBadgeLabel}
              isReminderPending={reminderPendingByAnnouncementId[item.id] ?? false}
              locale={locale}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
