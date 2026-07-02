"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Select, type SelectOption } from "@/components/ui/select";
import { changeInquiryStatusAction } from "@/lib/actions/helpdesk";
import type { Inquiry } from "@/types/inquiry";

export interface StatusSelectProps {
  inquiryId: string;
  status: Inquiry["status"];
  label: string;
  options: SelectOption[];
  errorMessage: string;
}

/**
 * 対応状況（新規・対応中・解決済み）を変更するセレクト。
 */
export function StatusSelect({
  inquiryId,
  status,
  label,
  options,
  errorMessage,
}: StatusSelectProps) {
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = event.target.value as Inquiry["status"];
    startTransition(async () => {
      try {
        await changeInquiryStatusAction(inquiryId, nextStatus);
        setHasError(false);
      } catch {
        setHasError(true);
      }
    });
  }

  return (
    <div className="space-y-1">
      <Label htmlFor="helpdesk-status-select">{label}</Label>
      <Select
        id="helpdesk-status-select"
        value={status}
        options={options}
        onChange={handleChange}
        disabled={isPending}
      />
      {hasError && !isPending && (
        <p role="status" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
