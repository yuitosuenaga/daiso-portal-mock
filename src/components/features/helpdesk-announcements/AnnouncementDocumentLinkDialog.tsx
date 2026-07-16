"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/attachment-utils";
import type { Document } from "@/types/document";

export interface AnnouncementDocumentLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 選択候補となる登録済みドキュメント一覧（絞り込みなしの全件）。 */
  documentOptions: Document[];
  /** 現在選択済みのドキュメントID一覧。 */
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  /** 選択できるドキュメントの最大件数。 */
  maxCount: number;
  dialogTitle: string;
  confirmButtonLabel: string;
  cancelButtonLabel: string;
  noDocumentsMessage: string;
  targetingAllLabel: string;
  targetingCountriesPrefixLabel: string;
  targetingCompaniesPrefixLabel: string;
}

function targetingSummary(
  document: Document,
  targetingAllLabel: string,
  targetingCountriesPrefixLabel: string,
  targetingCompaniesPrefixLabel: string
): string {
  if (document.targeting.scope === "countries") {
    return `${targetingCountriesPrefixLabel} ${document.targeting.countries.join(", ")}`;
  }
  if (document.targeting.scope === "companies") {
    return `${targetingCompaniesPrefixLabel} ${document.targeting.companyCodes.join(", ")}`;
  }
  return targetingAllLabel;
}

/**
 * `documents-management`spec配下に登録済みのドキュメントから、お知らせに紐づけるものを
 * 複数選択するダイアログ。ドキュメント自体の作成・編集・削除・公開範囲設定は行わず、
 * IDによる参照選択のみを扱う。
 */
export function AnnouncementDocumentLinkDialog({
  open,
  onOpenChange,
  documentOptions,
  selectedIds,
  onConfirm,
  maxCount,
  dialogTitle,
  confirmButtonLabel,
  cancelButtonLabel,
  noDocumentsMessage,
  targetingAllLabel,
  targetingCountriesPrefixLabel,
  targetingCompaniesPrefixLabel,
}: AnnouncementDocumentLinkDialogProps) {
  const [workingIds, setWorkingIds] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (open) {
      setWorkingIds(selectedIds);
    }
  }, [open, selectedIds]);

  function toggle(documentId: string) {
    setWorkingIds((current) => {
      if (current.includes(documentId)) {
        return current.filter((id) => id !== documentId);
      }
      if (current.length >= maxCount) {
        return current;
      }
      return [...current, documentId];
    });
  }

  function handleConfirm() {
    onConfirm(workingIds);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        {documentOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{noDocumentsMessage}</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {documentOptions.map((document) => {
              const checked = workingIds.includes(document.id);
              const disabled = !checked && workingIds.length >= maxCount;
              return (
                <li key={document.id}>
                  <label className="flex items-center gap-3 rounded-md border border-input p-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(document.id)}
                    />
                    <span className="flex-1">
                      <span className="block font-medium">{document.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {document.sourceType === "upload"
                          ? `${formatFileSize(document.fileSize)} · `
                          : ""}
                        {targetingSummary(
                          document,
                          targetingAllLabel,
                          targetingCountriesPrefixLabel,
                          targetingCompaniesPrefixLabel
                        )}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelButtonLabel}
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {confirmButtonLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
