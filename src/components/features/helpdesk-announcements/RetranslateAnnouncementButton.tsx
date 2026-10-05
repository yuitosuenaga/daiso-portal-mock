"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { retranslateAnnouncementAction } from "@/lib/actions/announcements";

export interface RetranslateAnnouncementButtonProps {
  announcementId: string;
  label: string;
  pendingLabel: string;
  successMessage: string;
  /** 一部のlocaleが翻訳に失敗したときの文言 */
  failedMessage: string;
  errorMessage: string;
  /** 初期表示するエラー通知（作成時の翻訳失敗からの遷移など）。再実行すると新しい結果に置き換わる */
  initialErrorMessage?: string;
}

/** 翻訳APIだけを再実行し、不足・失敗した言語を補う（公開状態は変更しない）。 */
export function RetranslateAnnouncementButton({
  announcementId,
  label,
  pendingLabel,
  successMessage,
  failedMessage,
  errorMessage,
  initialErrorMessage,
}: RetranslateAnnouncementButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(
    initialErrorMessage ? { text: initialErrorMessage, isError: true } : null
  );

  async function handleClick() {
    setIsPending(true);
    setMessage(null);
    try {
      const { failedLocales } = await retranslateAnnouncementAction(announcementId);
      setMessage(
        failedLocales.length > 0
          ? { text: failedMessage, isError: true }
          : { text: successMessage, isError: false }
      );
    } catch {
      setMessage({ text: errorMessage, isError: true });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? pendingLabel : label}
      </Button>
      {message && (
        <span
          role={message.isError ? "alert" : "status"}
          className={`text-sm ${message.isError ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message.text}
        </span>
      )}
    </div>
  );
}
