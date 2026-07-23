"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "@/i18n/navigation";
import { deleteLinkAction } from "@/lib/actions/links";

export interface DeleteLinkButtonProps {
  linkId: string;
  /** 削除対象のリンクタイトル。確認モーダルの文脈を補強するために使う。 */
  title: string;
  deleteButtonLabel: string;
  /** 確認モーダルの見出し */
  confirmTitle: string;
  /** 確認モーダルの本文。削除対象のリンクタイトルを含んだ、呼び出し側で解決済みの文言。 */
  confirmMessage: string;
  /** 確認モーダルの確認ボタン文言 */
  confirmButtonLabel: string;
  /** 確認モーダルのキャンセルボタン文言 */
  cancelButtonLabel: string;
  errorMessage: string;
}

/**
 * 共通`ConfirmDialog`（アプリ内モーダル）で確認したうえでリンクを削除するボタン。
 * `window.confirm()`ではなくポータル内モーダルで確認し、本文には削除対象のリンク
 * タイトルを明示する（要件11.1, 11.2）。確認モーダルで確定したときのみ削除処理を
 * 実行し、キャンセル時は何も実行しない（要件11.4）。
 * 削除成功後はリンク集管理一覧へ遷移する（一覧・編集画面のどちらから呼ばれても、
 * 削除後に対象が存在しない画面に留まらないようにするため）。
 */
export function DeleteLinkButton({
  linkId,
  title,
  deleteButtonLabel,
  confirmTitle,
  confirmMessage,
  confirmButtonLabel,
  cancelButtonLabel,
  errorMessage,
}: DeleteLinkButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  function handleConfirm() {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          await deleteLinkAction(linkId);
          setHasError(false);
          router.push("/helpdesk/links");
          resolve();
        } catch {
          setHasError(true);
          reject(new Error("failed to delete link"));
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
