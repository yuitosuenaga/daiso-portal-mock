"use client";

import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  staffFailureMessage,
  type StaffErrorMessages,
} from "@/components/features/helpdesk-staff/staff-error-messages";
import { setHelpdeskStaffRoleAction } from "@/lib/actions/helpdesk-staff";
import { formatTemplate } from "@/lib/format-template";
import type { HelpdeskStaffRole } from "@/types/helpdesk-staff";

export interface ToggleStaffRoleButtonLabels {
  promoteButton: string;
  demoteButton: string;
  promoteConfirmTitle: string;
  demoteConfirmTitle: string;
  /** `{name}`を対象スタッフの表示名に置き換える。 */
  promoteConfirm: string;
  /** `{name}`を対象スタッフの表示名に置き換える。 */
  demoteConfirm: string;
  promoteConfirmButton: string;
  demoteConfirmButton: string;
  cancelButton: string;
}

export interface ToggleStaffRoleButtonProps {
  staffId: string;
  staffName: string;
  role: HelpdeskStaffRole;
  /** 自分自身の行など、操作できないときtrue。 */
  disabled?: boolean;
  labels: ToggleStaffRoleButtonLabels;
  errors: StaffErrorMessages;
}

/**
 * 確認モーダルを経て、スタッフのロール（admin/member）を切り替えるボタン。
 * 失敗理由（自分自身・最後の有効admin・対象なし）は`reason`ごとの文言で表示する。
 */
export function ToggleStaffRoleButton({
  staffId,
  staffName,
  role,
  disabled = false,
  labels,
  errors,
}: ToggleStaffRoleButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isAdmin = role === "admin";

  function handleConfirm() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const result = await setHelpdeskStaffRoleAction(
            staffId,
            isAdmin ? "member" : "admin"
          );
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

  const triggerLabel = isAdmin ? labels.demoteButton : labels.promoteButton;

  return (
    <div className="flex flex-col items-start gap-1">
      <ConfirmDialog
        triggerLabel={triggerLabel}
        triggerVariant="outline"
        triggerDisabled={disabled || isPending}
        title={isAdmin ? labels.demoteConfirmTitle : labels.promoteConfirmTitle}
        description={formatTemplate(
          isAdmin ? labels.demoteConfirm : labels.promoteConfirm,
          { name: staffName }
        )}
        confirmLabel={
          isAdmin ? labels.demoteConfirmButton : labels.promoteConfirmButton
        }
        cancelLabel={labels.cancelButton}
        confirmVariant="default"
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
