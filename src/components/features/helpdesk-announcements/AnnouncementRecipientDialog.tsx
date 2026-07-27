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
import {
  sendAnnouncementRemindersAction,
  sendAnnouncementUserReadRemindersAction,
} from "@/lib/actions/announcement-tracking";
import type {
  AnnouncementRecipientStatusView,
  AnnouncementUserReadStatusView,
} from "@/types/announcement-recipient";

interface ConfirmedModeProps {
  /** 未確認の`ApplicantUser`一覧（個人単位・要件39.5） */
  mode: "confirmed";
  recipients: AnnouncementUserReadStatusView[];
}

interface CompletedModeProps {
  /** 未実施の会社一覧（会社単位・従来どおり） */
  mode: "completed";
  recipients: AnnouncementRecipientStatusView[];
}

export type AnnouncementRecipientDialogProps = (ConfirmedModeProps | CompletedModeProps) & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcementId: string;
};

interface DisplayRow {
  id: string;
  primaryLabel: string;
  email: string | null;
  companyName: string;
  country: string;
  reminderSentAt: string | null;
}

/**
 * 未対応の担当者一覧を表示し、個別・一括でリマインドを送信するダイアログ。
 * `mode: "confirmed"`は確認済みトラッキング対象母集団のうち未確認の`ApplicantUser`一覧
 * （担当者名・メール・会社名・国）を表示し、個人宛の既読リマインドを送信する（要件39.5, 39.6）。
 * `mode: "completed"`は従来どおり会社単位の未実施一覧＋完了督促を表示する（要件40.2）。
 */
export function AnnouncementRecipientDialog(props: AnnouncementRecipientDialogProps) {
  const { open, onOpenChange, announcementId } = props;
  const t = useTranslations("helpdeskAnnouncements.tracking");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const [locallyRemindedIds, setLocallyRemindedIds] = useState<string[]>([]);

  const rows: DisplayRow[] =
    props.mode === "confirmed"
      ? props.recipients.map((recipient) => ({
          id: recipient.applicantUserId,
          primaryLabel: recipient.displayName,
          email: recipient.email,
          companyName: recipient.companyName,
          country: recipient.country,
          reminderSentAt: recipient.readReminderSentAt,
        }))
      : props.recipients.map((recipient) => ({
          id: recipient.recipientId,
          primaryLabel: recipient.contactName,
          email: null,
          companyName: recipient.companyName,
          country: recipient.country,
          reminderSentAt: recipient.reminderSentAt,
        }));

  function isAlreadyReminded(row: DisplayRow): boolean {
    return row.reminderSentAt !== null || locallyRemindedIds.includes(row.id);
  }

  function handleRemind(ids: string[]) {
    startTransition(async () => {
      try {
        if (props.mode === "confirmed") {
          await sendAnnouncementUserReadRemindersAction(announcementId, ids);
        } else {
          await sendAnnouncementRemindersAction(announcementId, ids);
        }
        setLocallyRemindedIds((current) => [...current, ...ids]);
        setFeedback("success");
      } catch {
        setFeedback("error");
      }
    });
  }

  const pendingIds = rows.filter((row) => !isAlreadyReminded(row)).map((row) => row.id);
  const showEmailColumn = props.mode === "confirmed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {props.mode === "confirmed"
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

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("allRespondedMessage")}</p>
        ) : (
          <div className="space-y-3">
            {pendingIds.length > 0 && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleRemind(pendingIds)}
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
                    {showEmailColumn && (
                      <th className="pb-2 font-medium">{t("columnEmail")}</th>
                    )}
                    <th className="pb-2 font-medium">{t("columnCompany")}</th>
                    <th className="pb-2 font-medium">{t("columnCountry")}</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-2 font-medium">{row.primaryLabel}</td>
                      {showEmailColumn && (
                        <td className="py-2 pr-2 text-muted-foreground">{row.email}</td>
                      )}
                      <td className="py-2 pr-2 text-muted-foreground">{row.companyName}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{row.country}</td>
                      <td className="py-2 text-right">
                        {isAlreadyReminded(row) ? (
                          <span className="text-xs text-muted-foreground">
                            {t("alreadyRemindedLabel")}
                          </span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => handleRemind([row.id])}
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
