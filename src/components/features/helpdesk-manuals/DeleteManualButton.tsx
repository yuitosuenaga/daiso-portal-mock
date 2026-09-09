"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "@/i18n/navigation";
import { deleteManualAction } from "@/lib/actions/manuals";

export interface DeleteManualButtonProps {
  manualId: string;
  /** 削除対象のマニュアルタイトル。確認モーダルの文脈を補強するために使う。 */
  title: string;
  deleteButtonLabel: string;
  /** 確認モーダルの見出し */
  confirmTitle: string;
  /** 確認モーダルの本文。削除対象のマニュアルタイトルを含んだ、呼び出し側で解決済みの文言。 */
  confirmMessage: string;
  /** 確認モーダルの確認ボタン文言 */
  confirmButtonLabel: string;
  /** 確認モーダルのキャンセルボタン文言 */
  cancelButtonLabel: string;
  errorMessage: string;
}

/**
 * 共通`ConfirmDialog`（アプリ内モーダル）で確認したうえでマニュアルを削除するボタン
 * （`documents`specの`DeleteDocumentButton`と同型）。確認モーダルで確定したときのみ削除処理を
 * 実行し、キャンセル時は何も実行しない。削除成功後はマニュアル管理一覧へ遷移する。
 */
export function DeleteManualButton({
  manualId,
  title,
  deleteButtonLabel,
  confirmTitle,
  confirmMessage,
  confirmButtonLabel,
  cancelButtonLabel,
  errorMessage,
}: DeleteManualButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  function handleConfirm() {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          await deleteManualAction(manualId);
          setHasError(false);
          router.push("/helpdesk/manuals");
          resolve();
        } catch {
          setHasError(true);
          reject(new Error("failed to delete manual"));
        }
      });
    });
  }

  return (
    <div
      className="flex items-center gap-3"
      role="group"
      aria-label={`${deleteButtonLabel}: ${title}`}
    >
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
