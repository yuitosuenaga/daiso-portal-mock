"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "@/i18n/navigation";
import { deleteMonthlyMaterialAction } from "@/lib/actions/monthly-materials";
import type { MonthlyMaterialCategory } from "@/types/monthly-material";

export interface DeleteMonthlyMaterialButtonProps {
  materialId: string;
  category: MonthlyMaterialCategory;
  /** 削除対象の年月見出し（例:「2026年9月」）。確認モーダルの文脈を補強するために使う。 */
  label: string;
  deleteButtonLabel: string;
  confirmTitle: string;
  /** 確認モーダルの本文。削除対象の年月見出しを含んだ、呼び出し側で解決済みの文言。 */
  confirmMessage: string;
  confirmButtonLabel: string;
  cancelButtonLabel: string;
  errorMessage: string;
}

/**
 * 共通`ConfirmDialog`で確認したうえで月次資料を削除するボタン（`DeleteDocumentButton`と同型）。
 * 削除は一覧画面内（同一画面）で完結するため、削除後は画面遷移せず`router.refresh()`で
 * サーバーコンポーネントを再取得し、一覧から当該年月セクションが自然に消えるようにする。
 */
export function DeleteMonthlyMaterialButton({
  materialId,
  category,
  label,
  deleteButtonLabel,
  confirmTitle,
  confirmMessage,
  confirmButtonLabel,
  cancelButtonLabel,
  errorMessage,
}: DeleteMonthlyMaterialButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  function handleConfirm() {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          await deleteMonthlyMaterialAction(materialId, category);
          setHasError(false);
          router.refresh();
          resolve();
        } catch {
          setHasError(true);
          reject(new Error("failed to delete monthly material"));
        }
      });
    });
  }

  return (
    <div className="flex items-center gap-3" role="group" aria-label={`${deleteButtonLabel}: ${label}`}>
      <ConfirmDialog
        triggerLabel={deleteButtonLabel}
        triggerVariant="destructive"
        triggerDisabled={isPending}
        title={confirmTitle}
        description={confirmMessage}
        confirmLabel={confirmButtonLabel}
        cancelLabel={cancelButtonLabel}
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
