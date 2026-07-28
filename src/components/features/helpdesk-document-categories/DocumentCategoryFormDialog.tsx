"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { SelectOption } from "@/components/ui/select";
import { DocumentCategoryForm } from "@/components/features/helpdesk-document-categories/DocumentCategoryForm";
import type { DocumentCategory } from "@/types/document-category";

export interface DocumentCategoryDialogState {
  mode: "createParent" | "createChild" | "edit";
  parentId?: string;
  category?: DocumentCategory;
}

export interface DocumentCategoryFormDialogProps {
  state: DocumentCategoryDialogState | null;
  countryOptions: SelectOption[];
  companyOptions: SelectOption[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * カテゴリの追加（大分類／中分類）・編集フォームをモーダル表示するダイアログ。
 * `mode`は「大分類を追加」「中分類を追加（`parentId`固定）」「編集」の3種（要件19.3・19.4）。
 */
export function DocumentCategoryFormDialog({
  state,
  countryOptions,
  companyOptions,
  onClose,
  onSaved,
}: DocumentCategoryFormDialogProps) {
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        {state && (
          <DocumentCategoryForm
            mode={state.mode}
            parentId={state.parentId}
            category={state.category}
            countryOptions={countryOptions}
            companyOptions={companyOptions}
            onSaved={onSaved}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
