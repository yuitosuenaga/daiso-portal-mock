"use client";

import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  staffFailureMessage,
  type StaffErrorMessages,
} from "@/components/features/helpdesk-staff/staff-error-messages";
import { setHelpdeskStaffActiveAction } from "@/lib/actions/helpdesk-staff";
import { formatTemplate } from "@/lib/format-template";

export interface ToggleStaffActiveButtonLabels {
  deactivateButton: string;
  activateButton: string;
  deactivateConfirmTitle: string;
  activateConfirmTitle: string;
  /** `{name}`を対象スタッフの表示名に置き換える。担当中の問い合わせが解除されない旨の注記を含む。 */
  deactivateConfirm: string;
  /** `{name}`を対象スタッフの表示名に置き換える。 */
  activateConfirm: string;
  deactivateConfirmButton: string;
  activateConfirmButton: string;
  cancelButton: string;
}

export interface ToggleStaffActiveButtonProps {
  staffId: string;
  staffName: string;
  isActive: boolean;
  /** 自分自身の行など、操作できないときtrue。 */
  disabled?: boolean;
  labels: ToggleStaffActiveButtonLabels;
  errors: StaffErrorMessages;
}

/**
 * 確認モーダルを経て、スタッフの有効状態を切り替えるボタン。無効化の確認文には
 * 「担当中の問い合わせは解除されない」旨を含める（解除の改善は別対応）。
 */
export function ToggleStaffActiveButton({
  staffId,
  staffName,
  isActive,
  disabled = false,
  labels,
  errors,
}: ToggleStaffActiveButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleConfirm() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const result = await setHelpdeskStaffActiveAction(staffId, !isActive);
          if (!result.ok) {
            setErrorMessage(staffFailureMessage(result.reason, errors));
            // 失敗時もresolveしてダイアログを閉じ、エラーはダイアログの外側に表示する。
            resolve();
            return;
          }
          setErrorMessage(null);
          resolve();
        } catch {
          setErrorMessage(errors.generic);
          resolve();
        }
      });
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <ConfirmDialog
        triggerLabel={isActive ? labels.deactivateButton : labels.activateButton}
        triggerVariant={isActive ? "destructive" : "outline"}
        triggerDisabled={disabled || isPending}
        title={
          isActive ? labels.deactivateConfirmTitle : labels.activateConfirmTitle
        }
        description={formatTemplate(
          isActive ? labels.deactivateConfirm : labels.activateConfirm,
          { name: staffName }
        )}
        confirmLabel={
          isActive ? labels.deactivateConfirmButton : labels.activateConfirmButton
        }
        cancelLabel={labels.cancelButton}
        confirmVariant={isActive ? "destructive" : "outline"}
        isPending={isPending}
        onConfirm={handleConfirm}
      />
      {errorMessage && !isPending && (
        <span role="alert" className="text-sm text-destructive">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
