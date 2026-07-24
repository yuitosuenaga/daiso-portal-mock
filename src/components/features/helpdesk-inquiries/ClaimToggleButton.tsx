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
  notOwnerErrorMessage: string;
}

type ErrorKind = null | "generic" | "notOwner";

/**
 * 対応中フラグをON/OFFするボタン。対応中の場合は担当者名を表示する。
 * 解除操作が所有者不一致で拒否された場合は専用メッセージを表示する
 * （ボタン自体は非活性化しない。所有者チェックはサーバー側を唯一の正とする）。
 */
export function ClaimToggleButton({
  inquiryId,
  claim,
  claimButtonLabel,
  releaseButtonLabel,
  claimedByLabel,
  errorMessage,
  notOwnerErrorMessage,
}: ClaimToggleButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);

  function handleClick() {
    startTransition(async () => {
      try {
        if (claim) {
          const result = await releaseInquiryClaimAction(inquiryId);
          if (!result.ok) {
            setErrorKind("notOwner");
            return;
          }
        } else {
          await claimInquiryAction(inquiryId);
        }
        setErrorKind(null);
      } catch {
        setErrorKind("generic");
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
      {errorKind && !isPending && (
        <span role="status" className="text-sm text-destructive">
          {errorKind === "notOwner" ? notOwnerErrorMessage : errorMessage}
        </span>
      )}
    </div>
  );
}
