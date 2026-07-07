"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AttachmentField } from "@/components/features/inquiry-form/AttachmentField";
import { sendApplicantMessageAction } from "@/lib/actions/inquiry";
import type { InquiryAttachment } from "@/types/attachment";

export interface ApplicantMessageFormProps {
  inquiryId: string;
  bodyLabel: string;
  bodyPlaceholder: string;
  submitButtonLabel: string;
  submittingLabel: string;
  successMessage: string;
  errorMessage: string;
  attachmentsLabel: string;
  attachmentsHint: string;
  attachmentsRemoveButtonLabel: string;
  attachmentsSizeExceededMessage: string;
  attachmentsTypeNotAllowedMessage: string;
  attachmentsCountExceededMessage: string;
  attachmentsReadFailedMessage: string;
}

/**
 * 問い合わせへの追加メッセージ本文入力・添付ファイル選択・送信を行うフォーム。
 */
export function ApplicantMessageForm({
  inquiryId,
  bodyLabel,
  bodyPlaceholder,
  submitButtonLabel,
  submittingLabel,
  successMessage,
  errorMessage,
  attachmentsLabel,
  attachmentsHint,
  attachmentsRemoveButtonLabel,
  attachmentsSizeExceededMessage,
  attachmentsTypeNotAllowedMessage,
  attachmentsCountExceededMessage,
  attachmentsReadFailedMessage,
}: ApplicantMessageFormProps) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<InquiryAttachment[]>([]);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await sendApplicantMessageAction(inquiryId, body, attachments);
        setBody("");
        setAttachments([]);
        setStatus("sent");
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <Label htmlFor="applicant-message-body">{bodyLabel}</Label>
        <Textarea
          id="applicant-message-body"
          value={body}
          placeholder={bodyPlaceholder}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
        />
      </div>
      <AttachmentField
        value={attachments}
        onChange={setAttachments}
        label={attachmentsLabel}
        hint={attachmentsHint}
        removeButtonLabel={attachmentsRemoveButtonLabel}
        sizeExceededMessage={attachmentsSizeExceededMessage}
        typeNotAllowedMessage={attachmentsTypeNotAllowedMessage}
        countExceededMessage={attachmentsCountExceededMessage}
        readFailedMessage={attachmentsReadFailedMessage}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || body.trim().length === 0}>
          {isPending ? submittingLabel : submitButtonLabel}
        </Button>
        <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {!isPending && status === "sent" && successMessage}
          {!isPending && status === "error" && (
            <span className="text-destructive">{errorMessage}</span>
          )}
        </span>
      </div>
    </form>
  );
}
