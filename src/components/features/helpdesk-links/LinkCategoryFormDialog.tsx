"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LinkCategoryForm } from "@/components/features/helpdesk-links/LinkCategoryForm";
import type { LinkCategory } from "@/types/link-category";

export interface LinkCategoryDialogState {
  mode: "createParent" | "createChild" | "edit";
  parentId?: string;
  category?: LinkCategory;
}

export interface LinkCategoryFormDialogProps {
  state: LinkCategoryDialogState | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * カテゴリの追加（大分類／中分類）・編集フォームをモーダル表示するダイアログ。
 * `mode`は「大分類を追加」「中分類を追加（`parentId`固定）」「編集」の3種（要件13.3・13.4）。
 */
export function LinkCategoryFormDialog({
  state,
  onClose,
  onSaved,
}: LinkCategoryFormDialogProps) {
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        {state && (
          <LinkCategoryForm
            mode={state.mode}
            parentId={state.parentId}
            category={state.category}
            onSaved={onSaved}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
