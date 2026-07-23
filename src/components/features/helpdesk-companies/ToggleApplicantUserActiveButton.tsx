"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setApplicantUserActiveAction } from "@/lib/actions/applicant-users";

export interface ToggleApplicantUserActiveButtonProps {
  applicantUserId: string;
  /** 対象申請者アカウントの氏名。確認モーダルの文脈を補強するために使う。 */
  applicantUserName: string;
  /** 対象申請者アカウントのメールアドレス（任意）。指定時は確認モーダル本文に補助的に併記する。 */
  applicantUserEmail?: string;
  isActive: boolean;
  deactivateButtonLabel: string;
  activateButtonLabel: string;
  /** 無効化確認モーダルの見出し */
  deactivateConfirmTitle: string;
  /** 再有効化確認モーダルの見出し */
  activateConfirmTitle: string;
  /** 無効化確認モーダルの本文。対象アカウントの氏名を含んだ、呼び出し側で解決済みの文言。 */
  deactivateConfirmMessage: string;
  /** 再有効化確認モーダルの本文。対象アカウントの氏名を含んだ、呼び出し側で解決済みの文言。 */
  activateConfirmMessage: string;
  /** 無効化確認モーダルの確認ボタン文言 */
  deactivateConfirmButtonLabel: string;
  /** 再有効化確認モーダルの確認ボタン文言 */
  activateConfirmButtonLabel: string;
  /** 確認モーダルのキャンセルボタン文言（無効化・再有効化で共通） */
  cancelButtonLabel: string;
  errorMessage: string;
}

/**
 * 共通`ConfirmDialog`（アプリ内モーダル）で確認したうえで、申請者アカウントの
 * 有効状態を切り替えるボタン（要件7.1・7.2・7.6、要件17）。無効化・再有効化それぞれ
 * 異なる見出し・本文・確認ボタン文言・`confirmVariant`（無効化=`destructive`、
 * 再有効化=`outline`）を表示し、本文には対象アカウントの氏名を明示する
 * （要件17.2, 17.3）。確認モーダルで確定したときのみ`setApplicantUserActiveAction`を
 * 実行し、キャンセル時は何も実行しない（要件17.5）。
 */
export function ToggleApplicantUserActiveButton({
  applicantUserId,
  applicantUserName,
  applicantUserEmail,
  isActive,
  deactivateButtonLabel,
  activateButtonLabel,
  deactivateConfirmTitle,
  activateConfirmTitle,
  deactivateConfirmMessage,
  activateConfirmMessage,
  deactivateConfirmButtonLabel,
  activateConfirmButtonLabel,
  cancelButtonLabel,
  errorMessage,
}: ToggleApplicantUserActiveButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  function handleConfirm() {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          await setApplicantUserActiveAction(applicantUserId, !isActive);
          setHasError(false);
          resolve();
        } catch {
          setHasError(true);
          reject(new Error("failed to toggle applicant user active state"));
        }
      });
    });
  }

  const confirmMessage = isActive ? deactivateConfirmMessage : activateConfirmMessage;
  const description: ReactNode = applicantUserEmail ? (
    <>
      <p>{confirmMessage}</p>
      <p className="mt-1 text-xs text-muted-foreground">{applicantUserEmail}</p>
    </>
  ) : (
    confirmMessage
  );

  return (
    <div
      className="flex items-center gap-3"
      role="group"
      aria-label={`${isActive ? deactivateButtonLabel : activateButtonLabel}: ${applicantUserName}`}
    >
      <ConfirmDialog
        triggerLabel={isActive ? deactivateButtonLabel : activateButtonLabel}
        triggerVariant={isActive ? "destructive" : "outline"}
        triggerDisabled={isPending}
        title={isActive ? deactivateConfirmTitle : activateConfirmTitle}
        description={description}
        confirmLabel={isActive ? deactivateConfirmButtonLabel : activateConfirmButtonLabel}
        cancelLabel={cancelButtonLabel}
        confirmVariant={isActive ? "destructive" : "outline"}
        isPending={isPending}
        onConfirm={handleConfirm}
      />
      {hasError && !isPending && (
        <span role="status" className="text-sm text-destructive">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
