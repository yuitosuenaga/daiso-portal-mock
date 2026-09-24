"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { retryInquiryTranslationAction } from "@/lib/actions/helpdesk";

export interface RetryTranslationButtonProps {
  inquiryId: string;
  label: string;
  errorMessage: string;
}

/** 自動翻訳が未実行・失敗している問い合わせを再翻訳するボタン。 */
export function RetryTranslationButton({
  inquiryId,
  label,
  errorMessage,
}: RetryTranslationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  function handleClick() {
    startTransition(async () => {
      try {
        await retryInquiryTranslationAction(inquiryId);
        setHasError(false);
      } catch {
        setHasError(true);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        {label}
      </Button>
      {hasError && !isPending && (
        <span role="status" className="text-sm text-destructive">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
