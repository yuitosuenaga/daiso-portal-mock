"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  claimInquiryAction,
  releaseInquiryClaimAction,
} from "@/lib/actions/helpdesk";
import type { Inquiry } from "@/types/inquiry";

export interface ClaimToggleButtonProps {
  inquiryId: string;
  claim: Inquiry["claim"];
  claimButtonLabel: string;
  releaseButtonLabel: string;
  claimedByLabel: string;
  errorMessage: string;
}

/**
 * 対応中フラグをON/OFFするボタン。対応中の場合は担当者名を表示する。
 */
export function ClaimToggleButton({
  inquiryId,
  claim,
  claimButtonLabel,
  releaseButtonLabel,
  claimedByLabel,
  errorMessage,
}: ClaimToggleButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  function handleClick() {
    startTransition(async () => {
      try {
        if (claim) {
          await releaseInquiryClaimAction(inquiryId);
        } else {
          await claimInquiryAction(inquiryId);
        }
        setHasError(false);
      } catch {
        setHasError(true);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {claim && (
        <Badge>
          {claimedByLabel}: {claim.staffName}
        </Badge>
      )}
      <Button
        type="button"
        variant={claim ? "outline" : "default"}
        onClick={handleClick}
        disabled={isPending}
      >
        {claim ? releaseButtonLabel : claimButtonLabel}
      </Button>
      {hasError && !isPending && (
        <span role="status" className="text-sm text-destructive">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
