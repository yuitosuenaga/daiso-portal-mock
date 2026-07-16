"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setApplicantUserActiveAction } from "@/lib/actions/applicant-users";

export interface ToggleApplicantUserActiveButtonProps {
  applicantUserId: string;
  isActive: boolean;
  deactivateButtonLabel: string;
  activateButtonLabel: string;
  deactivateConfirmMessage: string;
  activateConfirmMessage: string;
  errorMessage: string;
}

/**
 * ブラウザ標準の`confirm()`で確認したうえで、申請者アカウントの有効状態を
 * 切り替えるボタン（要件7.1・7.2・7.6）。無効化・再有効化それぞれ異なる
 * 確認文言・ボタンラベルを表示する。
 */
export function ToggleApplicantUserActiveButton({
  applicantUserId,
  isActive,
  deactivateButtonLabel,
  activateButtonLabel,
  deactivateConfirmMessage,
  activateConfirmMessage,
  errorMessage,
}: ToggleApplicantUserActiveButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  function handleClick() {
    const confirmMessage = isActive ? deactivateConfirmMessage : activateConfirmMessage;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setHasError(false);
    startTransition(async () => {
      try {
        await setApplicantUserActiveAction(applicantUserId, !isActive);
      } catch {
        setHasError(true);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant={isActive ? "destructive" : "outline"}
        onClick={handleClick}
        disabled={isPending}
      >
        {isActive ? deactivateButtonLabel : activateButtonLabel}
      </Button>
      {hasError && !isPending && (
        <span role="status" className="text-sm text-destructive">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
