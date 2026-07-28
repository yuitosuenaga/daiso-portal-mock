"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { moveDocumentCategoryAction } from "@/lib/actions/document-categories";
import type { DocumentCategoryMoveDirection } from "@/types/document-category";

export interface DocumentCategoryOrderButtonsProps {
  categoryId: string;
  /** 同一階層の先頭かどうか。先頭のとき「上へ」を無効化する。 */
  isFirst: boolean;
  /** 同一階層の末尾かどうか。末尾のとき「下へ」を無効化する。 */
  isLast: boolean;
  onMoved: () => void;
}

/**
 * カテゴリの表示順を変更する「上へ」「下へ」ボタン（要件19.11）。
 * 同一階層の先頭では「上へ」・末尾では「下へ」を無効化する。
 */
export function DocumentCategoryOrderButtons({
  categoryId,
  isFirst,
  isLast,
  onMoved,
}: DocumentCategoryOrderButtonsProps) {
  const t = useTranslations("helpdeskDocumentCategories.list");
  const [isPending, startTransition] = useTransition();

  function handleMove(direction: DocumentCategoryMoveDirection) {
    startTransition(async () => {
      await moveDocumentCategoryAction(categoryId, direction);
      onMoved();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isFirst || isPending}
        onClick={() => handleMove("up")}
      >
        {t("moveUpButton")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isLast || isPending}
        onClick={() => handleMove("down")}
      >
        {t("moveDownButton")}
      </Button>
    </div>
  );
}
