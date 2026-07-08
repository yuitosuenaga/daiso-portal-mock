"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sendAnnouncementRemindersAction } from "@/lib/actions/announcement-tracking";
import type { AnnouncementRecipientStatusView } from "@/types/announcement-recipient";

export interface AnnouncementRecipientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcementId: string;
  /** どの状態（未確認/未実施）の担当者一覧かを示す表示モード */
  mode: "confirmed" | "completed";
  /** 未対応（`mode`に応じた未確認または未実施）の担当者一覧 */
  recipients: AnnouncementRecipientStatusView[];
}

/**
 * 未対応の担当者一覧を表示し、個別・一括でリマインドを送信するダイアログ。
 * 実際の通知配信は行わず、送信完了の表示のみを行う。
 */
export function AnnouncementRecipientDialog({
  open,
  onOpenChange,
  announcementId,
  mode,
  recipients,
}: AnnouncementRecipientDialogProps) {
  const t = useTranslations("helpdeskAnnouncements.tracking");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const [locallyRemindedIds, setLocallyRemindedIds] = useState<string[]>([]);

  function handleRemind(recipientIds: string[]) {
    startTransition(async () => {
      try {
        await sendAnnouncementRemindersAction(announcementId, recipientIds);
        setLocallyRemindedIds((current) => [...current, ...recipientIds]);
        setFeedback("success");
      } catch {
        setFeedback("error");
      }
    });
  }

  function isAlreadyReminded(recipient: AnnouncementRecipientStatusView): boolean {
    return (
      recipient.reminderSentAt !== null ||
      locallyRemindedIds.includes(recipient.recipientId)
    );
  }

  const pendingRecipientIds = recipients
    .filter((recipient) => !isAlreadyReminded(recipient))
    .map((recipient) => recipient.recipientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "confirmed"
              ? t("dialogTitleConfirmed")
              : t("dialogTitleCompleted")}
          </DialogTitle>
        </DialogHeader>

        {feedback === "success" && (
          <Alert variant="success">
            <AlertDescription>{t("remindSuccessMessage")}</AlertDescription>
          </Alert>
        )}
        {feedback === "error" && (
          <Alert variant="destructive">
            <AlertDescription>{t("remindErrorMessage")}</AlertDescription>
          </Alert>
        )}

        {recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("allRespondedMessage")}</p>
        ) : (
          <div className="space-y-3">
            {pendingRecipientIds.length > 0 && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleRemind(pendingRecipientIds)}
                >
                  {t("remindAllButton")}
                </Button>
              </div>
            )}
            <div className="max-h-80 overflow-x-auto overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">{t("columnContact")}</th>
                    <th className="pb-2 font-medium">{t("columnCompany")}</th>
                    <th className="pb-2 font-medium">{t("columnCountry")}</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recipients.map((recipient) => (
                    <tr key={recipient.recipientId}>
                      <td className="py-2 pr-2 font-medium">
                        {recipient.contactName}
                      </td>
                      <td className="py-2 pr-2 text-muted-foreground">
                        {recipient.companyName}
                      </td>
                      <td className="py-2 pr-2 text-muted-foreground">
                        {recipient.country}
                      </td>
                      <td className="py-2 text-right">
                        {isAlreadyReminded(recipient) ? (
                          <span className="text-xs text-muted-foreground">
                            {t("alreadyRemindedLabel")}
                          </span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => handleRemind([recipient.recipientId])}
                          >
                            {t("remindButton")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
