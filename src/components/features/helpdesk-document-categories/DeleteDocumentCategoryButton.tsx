"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteDocumentCategoryAction } from "@/lib/actions/document-categories";

export interface DeleteDocumentCategoryButtonProps {
  categoryId: string;
  /** 削除対象のカテゴリ名（既定言語＝ja）。確認モーダルの本文に明示する。 */
  name: string;
  /** 直接紐づくドキュメント件数（一覧取得が返す値をそのまま使い、追加取得は行わない） */
  documentCount: number;
  /** 配下の中分類件数（中分類自身は常に0） */
  childCount: number;
  onDeleted: () => void;
}

/**
 * カテゴリの削除ボタン。紐づくドキュメント・配下の中分類がいずれも0件のときのみ
 * `ConfirmDialog`で確認を求め（要件19.7）、1件以上あるときは確認ダイアログを開かず、
 * 件数を明示したエラーメッセージを表示して操作をブロックする（要件19.8・19.9）。
 * 件数は呼び出し元（一覧取得）から受け取ったものを用い、押下時の追加取得は行わない。
 */
export function DeleteDocumentCategoryButton({
  categoryId,
  name,
  documentCount,
  childCount,
  onDeleted,
}: DeleteDocumentCategoryButtonProps) {
  const t = useTranslations("helpdeskDocumentCategories.list.delete");
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  const isBlockedByDocuments = documentCount > 0;
  const isBlockedByChildren = childCount > 0;
  const isBlocked = isBlockedByDocuments || isBlockedByChildren;

  function handleConfirm() {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          await deleteDocumentCategoryAction(categoryId);
          setHasError(false);
          onDeleted();
          resolve();
        } catch {
          setHasError(true);
          reject(new Error("failed to delete document category"));
        }
      });
    });
  }

  if (isBlocked) {
    return (
      <div className="flex flex-col gap-1" role="group" aria-label={`${t("buttonLabel")}: ${name}`}>
        <button
          type="button"
          disabled
          className="inline-flex w-fit items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground opacity-50"
        >
          {t("buttonLabel")}
        </button>
        <p role="alert" className="text-xs text-destructive">
          {isBlockedByDocuments
            ? t("blockedByDocuments", { name, count: documentCount })
            : t("blockedByChildren", { name, count: childCount })}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3" role="group" aria-label={`${t("buttonLabel")}: ${name}`}>
      <ConfirmDialog
        triggerLabel={t("buttonLabel")}
        triggerVariant="destructive"
        triggerDisabled={isPending}
        title={t("confirmTitle")}
        description={t("confirmMessage", { name })}
        confirmLabel={t("confirmButtonLabel")}
        cancelLabel={t("cancelButtonLabel")}
        isPending={isPending}
        onConfirm={handleConfirm}
      />
      {hasError && !isPending && (
        <span role="status" className="text-sm text-destructive">
          {t("errorMessage")}
        </span>
      )}
    </div>
  );
}
