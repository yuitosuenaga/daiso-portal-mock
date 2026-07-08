"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatFileSize, readFileAsDataUrl } from "@/lib/attachment-utils";
import { validateDocumentFile } from "@/lib/document-utils";
import { DOCUMENT_ALLOWED_MIME_TYPES } from "@/lib/constants/document";

const ACCEPT_ATTRIBUTE = DOCUMENT_ALLOWED_MIME_TYPES.join(",");

export interface DocumentFileValue {
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string;
}

export interface DocumentFileFieldProps {
  /** 選択済みのファイル（未選択・削除済みの場合はnull） */
  value: DocumentFileValue | null;
  onChange: (file: DocumentFileValue | null) => void;
  label: string;
  hint: string;
  removeButtonLabel: string;
  sizeExceededMessage: string;
  typeNotAllowedMessage: string;
  readFailedMessage: string;
  id?: string;
}

/**
 * 単一のPDFファイルを選択・検証・Base64変換するフィールド。
 * `inquiry-form`の`AttachmentField`と異なり、1ドキュメント=1ファイルの1対1関係のため
 * 複数選択・件数制限は扱わない。
 */
export function DocumentFileField({
  value,
  onChange,
  label,
  hint,
  removeButtonLabel,
  sizeExceededMessage,
  typeNotAllowedMessage,
  readFailedMessage,
  id,
}: DocumentFileFieldProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const [error, setError] = React.useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    event.target.value = "";

    const result = validateDocumentFile(file);
    if (!result.valid) {
      setError(
        result.reason === "size" ? sizeExceededMessage : typeNotAllowedMessage
      );
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setError(null);
      onChange({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        dataUrl,
      });
    } catch {
      setError(readFailedMessage);
    }
  }

  function handleRemove() {
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <Input
        id={inputId}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        onChange={handleChange}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {value && (
        <div className="mt-1 flex items-center gap-2 rounded-md border border-input p-2 text-sm">
          <span className="max-w-[16rem] truncate">
            {value.fileName} ({formatFileSize(value.fileSize)})
          </span>
          <Button
            type="button"
            variant="outline"
            aria-label={`${removeButtonLabel}: ${value.fileName}`}
            onClick={handleRemove}
          >
            {removeButtonLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
