"use client";

import { useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";

type ButtonVariant = ButtonProps["variant"];

export interface ConfirmDialogProps {
  /** トリガーボタンに表示する文言 */
  triggerLabel: string;
  /** トリガーボタンの`variant` */
  triggerVariant?: ButtonVariant;
  /** トリガーボタンを無効化するかどうか */
  triggerDisabled?: boolean;
  /** 確認ダイアログの見出し */
  title: string;
  /** 確認ダイアログの本文（対象名を含む文字列またはReactNode） */
  description: ReactNode;
  /** 確認ボタンの文言 */
  confirmLabel: string;
  /** キャンセルボタンの文言 */
  cancelLabel: string;
  /** 確認ボタンの`variant`（既定は`destructive`） */
  confirmVariant?: ButtonVariant;
  /** 確認処理が実行中かどうか。`true`の間は確認ボタンを`disabled`にする */
  isPending?: boolean;
  /** 確認ボタン押下時に実行するコールバック（非同期を許容） */
  onConfirm: () => void | Promise<void>;
}

/**
 * 破壊的操作（削除・無効化等）の確認をポータル内モーダルで行うための共通コンポーネント。
 * `window.confirm()`の代替として、操作対象名を含めた文言をpropsで受け取り表示する。
 * 表示文言は一切固定で持たず、i18nの解決は利用側の責務とする。
 */
export function ConfirmDialog({
  triggerLabel,
  triggerVariant,
  triggerDisabled,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = "destructive",
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    try {
      await onConfirm();
      // 成功時は自動的に閉じる。失敗時はエラー表示（利用側の責務）のため開いたままにする。
      setOpen(false);
    } catch {
      // onConfirm呼び出し側がエラーハンドリング・表示を担う。ここでは再スローしない。
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          disabled={triggerDisabled}
        >
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={isPending}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
