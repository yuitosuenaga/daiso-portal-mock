"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AnnouncementRecipientDialog } from "@/components/features/helpdesk-announcements/AnnouncementRecipientDialog";
import type {
  AnnouncementRecipientStatusView,
  AnnouncementUserReadStatusView,
} from "@/types/announcement-recipient";

export interface AnnouncementTrackingBadgeProps {
  announcementId: string;
  actionRequired: boolean;
  /** 確認済みトラッキング対象母集団（個人単位・要件39.2）の受信レシート結合ビュー */
  userReadStatuses: AnnouncementUserReadStatusView[];
  /** 実施済みトラッキング対象（会社単位）の状態ビュー */
  recipientStatuses: AnnouncementRecipientStatusView[];
}

type DialogMode = "confirmed" | "completed";

/**
 * お知らせごとの確認済み（人数ベース）・実施済み（会社ベース）人数を表示し、クリックで
 * 未対応者一覧ダイアログを開く。確認済みと実施済みは単位（人/社）・分母が異なるため、
 * 別々の読み取り結果から集計する（要件39.5, 40.2, 40.3）。`actionRequired`が真の場合のみ
 * 実施済み人数を併記する。
 */
export function AnnouncementTrackingBadge({
  announcementId,
  actionRequired,
  userReadStatuses,
  recipientStatuses,
}: AnnouncementTrackingBadgeProps) {
  const t = useTranslations("helpdeskAnnouncements.tracking");
  const [openMode, setOpenMode] = useState<DialogMode | null>(null);

  const totalRecipientUsers = userReadStatuses.length;
  const confirmedCount = useMemo(
    () => userReadStatuses.filter((status) => status.confirmedAt !== null).length,
    [userReadStatuses]
  );

  const totalCompanies = recipientStatuses.length;
  const completedCount = useMemo(
    () => recipientStatuses.filter((status) => status.completedAt !== null).length,
    [recipientStatuses]
  );

  const unconfirmedUsers = useMemo(
    () => userReadStatuses.filter((status) => status.confirmedAt === null),
    [userReadStatuses]
  );
  const uncompletedRecipients = useMemo(
    () => recipientStatuses.filter((status) => status.completedAt === null),
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
          {t("confirmedCount", { confirmed: confirmedCount, total: totalRecipientUsers })}
        </button>
        {actionRequired && (
          <button
            type="button"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => setOpenMode("completed")}
          >
            {t("completedCount", { completed: completedCount, total: totalCompanies })}
          </button>
        )}
      </div>
      {openMode === "confirmed" && (
        <AnnouncementRecipientDialog
          open
          onOpenChange={(nextOpen) => setOpenMode(nextOpen ? "confirmed" : null)}
          announcementId={announcementId}
          mode="confirmed"
          recipients={unconfirmedUsers}
        />
      )}
      {openMode === "completed" && (
        <AnnouncementRecipientDialog
          open
          onOpenChange={(nextOpen) => setOpenMode(nextOpen ? "completed" : null)}
          announcementId={announcementId}
          mode="completed"
          recipients={uncompletedRecipients}
        />
      )}
    </>
  );
}
