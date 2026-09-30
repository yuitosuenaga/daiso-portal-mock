"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AnnouncementUserReadStatusView } from "@/types/announcement-recipient";

export interface AnnouncementConfirmersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 確認者氏名が1件以上入力されているアカウントのみを渡す */
  userReadStatuses: AnnouncementUserReadStatusView[];
}

/**
 * 海外側の共有アカウントで入力された確認者氏名を、アカウント（担当者名・会社・国）ごとに
 * 一覧表示する閲覧専用ダイアログ。
 */
export function AnnouncementConfirmersDialog({
  open,
  onOpenChange,
  userReadStatuses,
}: AnnouncementConfirmersDialogProps) {
  const t = useTranslations("helpdeskAnnouncements.tracking");
  const locale = useLocale();

  const rows = userReadStatuses.flatMap((status) =>
    status.confirmers.map((confirmer) => ({
      key: `${status.applicantUserId}:${confirmer.name}`,
      confirmerName: confirmer.name,
      confirmedAt: confirmer.confirmedAt,
      accountName: status.displayName,
      companyName: status.companyName,
      country: status.country,
    }))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitleConfirmers")}</DialogTitle>
        </DialogHeader>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("confirmersEmptyMessage")}</p>
        ) : (
          <div className="max-h-80 overflow-x-auto overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">{t("columnConfirmerName")}</th>
                  <th className="pb-2 font-medium">{t("columnContact")}</th>
                  <th className="pb-2 font-medium">{t("columnCompany")}</th>
                  <th className="pb-2 font-medium">{t("columnCountry")}</th>
                  <th className="pb-2 font-medium">{t("columnConfirmedAt")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td className="py-2 pr-2 font-medium">{row.confirmerName}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{row.accountName}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{row.companyName}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{row.country}</td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(row.confirmedAt).toLocaleString(locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
