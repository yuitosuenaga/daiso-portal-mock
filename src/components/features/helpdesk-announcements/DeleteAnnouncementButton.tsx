"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "@/i18n/navigation";
import { deleteAnnouncementAction } from "@/lib/actions/announcements";

export interface DeleteAnnouncementButtonProps {
  announcementId: string;
  /** 削除対象のお知らせタイトル（表示ロケールで解決済み）。確認モーダルの文脈を補強するために使う。 */
  announcementTitle: string;
  deleteButtonLabel: string;
  /** 確認モーダルの見出し */
  confirmTitle: string;
  /** 確認モーダルの本文。削除対象のタイトルを含んだ、呼び出し側で解決済みの文言。 */
  confirmDescription: string;
  /** 確認モーダルの確認ボタン文言 */
  confirmLabel: string;
  /** 確認モーダルのキャンセルボタン文言 */
  cancelLabel: string;
  errorMessage: string;
}

/**
 * 共通`ConfirmDialog`（アプリ内モーダル）で確認したうえでお知らせを削除するボタン。
 * `window.confirm()`ではなくポータル内モーダルで確認し、本文には削除対象のタイトルを
 * 明示する（要件37.1, 37.2）。確認モーダルで確定したときのみ削除処理を実行し、
 * キャンセル時は何も実行しない（要件37.4）。
 * 削除成功後はお知らせ管理一覧へ遷移する（一覧・編集画面のどちらから呼ばれても、
 * 削除後に対象が存在しない画面に留まらないようにするため）。
 */
export function DeleteAnnouncementButton({
  announcementId,
  announcementTitle,
  deleteButtonLabel,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  cancelLabel,
  errorMessage,
}: DeleteAnnouncementButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  function handleConfirm() {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          await deleteAnnouncementAction(announcementId);
          setHasError(false);
          router.push("/helpdesk/announcements");
          resolve();
        } catch {
          setHasError(true);
          reject(new Error("failed to delete announcement"));
        }
      });
    });
  }

  return (
    <div
      className="flex items-center gap-3"
      role="group"
      aria-label={`${deleteButtonLabel}: ${announcementTitle}`}
    >
      <ConfirmDialog
        triggerLabel={deleteButtonLabel}
        triggerVariant="destructive"
        triggerDisabled={isPending}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
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
