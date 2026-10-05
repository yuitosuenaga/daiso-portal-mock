"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { retranslateDocumentAction } from "@/lib/actions/documents";

export interface RetranslateDocumentButtonProps {
  documentId: string;
  /** ボタンのラベル（例: 「翻訳を再実行」） */
  label: string;
  /** 全言語の翻訳が揃ったときのメッセージ */
  successMessage: string;
  /** 一部の言語が翻訳できなかった（または実行自体に失敗した）ときのメッセージ */
  failureMessage: string;
  /** 全言語の翻訳が揃ったときに呼ばれる */
  onCompleted?: () => void;
}

/**
 * 翻訳APIのみを再実行するボタン。不足している言語だけを翻訳して保存する
 * （`retranslateDocumentAction`）。編集画面・一覧のどちらにも配置できる。
 */
export function RetranslateDocumentButton({
  documentId,
  label,
  successMessage,
  failureMessage,
  onCompleted,
}: RetranslateDocumentButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "failure">("idle");

  function handleClick() {
    setStatus("idle");
    startTransition(async () => {
      try {
        const { failedLocales } = await retranslateDocumentAction(documentId);
        if (failedLocales.length === 0) {
          setStatus("success");
          onCompleted?.();
        } else {
          setStatus("failure");
        }
      } catch {
        setStatus("failure");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="outline" disabled={isPending} onClick={handleClick}>
        {label}
      </Button>
      {status !== "idle" && (
        <span
          role="status"
          className={`text-sm ${status === "success" ? "text-foreground" : "text-destructive"}`}
        >
          {status === "success" ? successMessage : failureMessage}
        </span>
      )}
    </div>
  );
}
