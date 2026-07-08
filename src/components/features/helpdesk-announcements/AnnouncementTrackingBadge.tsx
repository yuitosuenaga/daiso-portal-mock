"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AnnouncementRecipientDialog } from "@/components/features/helpdesk-announcements/AnnouncementRecipientDialog";
import type { AnnouncementRecipientStatusView } from "@/types/announcement-recipient";

export interface AnnouncementTrackingBadgeProps {
  announcementId: string;
  actionRequired: boolean;
  recipientStatuses: AnnouncementRecipientStatusView[];
}

type DialogMode = "confirmed" | "completed";

/**
 * お知らせごとの確認済み・実施済み人数を表示し、クリックで未対応者一覧ダイアログを開く。
 * `actionRequired`が真の場合のみ実施済み人数を併記する。
 */
export function AnnouncementTrackingBadge({
  announcementId,
  actionRequired,
  recipientStatuses,
}: AnnouncementTrackingBadgeProps) {
  const t = useTranslations("helpdeskAnnouncements.tracking");
  const [openMode, setOpenMode] = useState<DialogMode | null>(null);

  const total = recipientStatuses.length;
  const confirmedCount = useMemo(
    () => recipientStatuses.filter((status) => status.confirmedAt !== null).length,
    [recipientStatuses]
  );
  const completedCount = useMemo(
    () => recipientStatuses.filter((status) => status.completedAt !== null).length,
    [recipientStatuses]
  );

  const unrespondedRecipients = useMemo(
    () => ({
      confirmed: recipientStatuses.filter((status) => status.confirmedAt === null),
      completed: recipientStatuses.filter((status) => status.completedAt === null),
    }),
    [recipientStatuses]
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <button
          type="button"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => setOpenMode("confirmed")}
        >
          {t("confirmedCount", { confirmed: confirmedCount, total })}
        </button>
        {actionRequired && (
          <button
            type="button"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => setOpenMode("completed")}
          >
            {t("completedCount", { completed: completedCount, total })}
          </button>
        )}
      </div>
      {openMode && (
        <AnnouncementRecipientDialog
          open
          onOpenChange={(nextOpen) => setOpenMode(nextOpen ? openMode : null)}
          announcementId={announcementId}
          mode={openMode}
          recipients={unrespondedRecipients[openMode]}
        />
      )}
    </>
  );
}
