"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AttachmentField } from "@/components/features/inquiry-form/AttachmentField";
import { sendInquiryReplyAction } from "@/lib/actions/helpdesk";
import type { InquiryAttachment } from "@/types/attachment";
import type { ReplyTemplate } from "@/types/reply-template";

export interface ReplyFormProps {
  inquiryId: string;
  templates: ReplyTemplate[];
  templateLabel: string;
  templatePlaceholder: string;
  noTemplatesMessage: string;
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
 * カテゴリ別テンプレートの選択・挿入、添付ファイルの選択、返信本文の入力・送信を行うフォーム。
 */
export function ReplyForm({
  inquiryId,
  templates,
  templateLabel,
  templatePlaceholder,
  noTemplatesMessage,
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
}: ReplyFormProps) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<InquiryAttachment[]>([]);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  function handleTemplateChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const template = templates.find((item) => item.id === event.target.value);
    if (template) {
      setBody(template.body);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await sendInquiryReplyAction(inquiryId, body, attachments);
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
      {templates.length > 0 ? (
        <div className="space-y-1">
          <Label htmlFor="helpdesk-reply-template">{templateLabel}</Label>
          <Select
            id="helpdesk-reply-template"
            defaultValue=""
            placeholder={templatePlaceholder}
            options={templates.map((template) => ({
              value: template.id,
              label: template.name,
            }))}
            onChange={handleTemplateChange}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{noTemplatesMessage}</p>
      )}
      <div className="space-y-1">
        <Label htmlFor="helpdesk-reply-body">{bodyLabel}</Label>
        <Textarea
          id="helpdesk-reply-body"
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
