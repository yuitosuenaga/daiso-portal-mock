"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { deleteDocumentAction } from "@/lib/actions/documents";

export interface DeleteDocumentButtonProps {
  documentId: string;
  deleteButtonLabel: string;
  confirmMessage: string;
  errorMessage: string;
}

/**
 * ブラウザ標準の`confirm()`で確認したうえでドキュメントを削除するボタン。
 * 削除成功後はドキュメント管理一覧へ遷移する（一覧・編集画面のどちらから呼ばれても、
 * 削除後に対象が存在しない画面に留まらないようにするため）。
 */
export function DeleteDocumentButton({
  documentId,
  deleteButtonLabel,
  confirmMessage,
  errorMessage,
}: DeleteDocumentButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  function handleClick() {
    if (!window.confirm(confirmMessage)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteDocumentAction(documentId);
        router.push("/helpdesk/documents");
      } catch {
        setHasError(true);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="destructive"
        onClick={handleClick}
        disabled={isPending}
      >
        {deleteButtonLabel}
      </Button>
      {hasError && !isPending && (
        <span role="status" className="text-sm text-destructive">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
