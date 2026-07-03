"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { readFileAsDataUrl, validateAttachmentFile } from "@/lib/attachment-utils";
import { ATTACHMENT_ALLOWED_MIME_TYPES } from "@/lib/constants/attachment";
import type { InquiryAttachment } from "@/types/attachment";

const ACCEPT_ATTRIBUTE = ATTACHMENT_ALLOWED_MIME_TYPES.join(",");

export interface AttachmentFieldProps {
  /** 選択済みの添付ファイル一覧 */
  value: InquiryAttachment[];
  onChange: (attachments: InquiryAttachment[]) => void;
  /** 表示済みのラベル文字列（翻訳解決は呼び出し側の責務） */
  label: string;
  /** 上限・許可形式を説明する補足文言 */
  hint: string;
  removeButtonLabel: string;
  sizeExceededMessage: string;
  typeNotAllowedMessage: string;
  countExceededMessage: string;
  /** ファイルの読み取り（データURL変換）自体が失敗したときのメッセージ */
  readFailedMessage: string;
  id?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * 複数ファイルの選択・検証・プレビュー・削除を行う添付ファイル入力コンポーネント。
 * `inquiryId`等の文脈に依存しない汎用設計とし、返信フォーム側からも再利用できるようにする。
 */
export function AttachmentField({
  value,
  onChange,
  label,
  hint,
  removeButtonLabel,
  sizeExceededMessage,
  typeNotAllowedMessage,
  countExceededMessage,
  readFailedMessage,
  id,
}: AttachmentFieldProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const [errors, setErrors] = React.useState<string[]>([]);

  function messageFor(reason: "size" | "type" | "count"): string {
    switch (reason) {
      case "size":
        return sizeExceededMessage;
      case "type":
        return typeNotAllowedMessage;
      case "count":
        return countExceededMessage;
    }
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    // FileListをプレーンな配列へ変換してから input.value をリセットする。
    // 順序を逆にすると、ブラウザによっては value リセットと同時に元の FileList 自体が
    // 空になり（同一参照が書き換わる）、選択したファイルを取りこぼす
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const selectedFiles = Array.from(files);
    event.target.value = "";

    let runningCount = value.length;
    const newErrorMessages: string[] = [];
    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      const result = validateAttachmentFile(file, runningCount);
      if (!result.valid) {
        const message = messageFor(result.reason);
        if (!newErrorMessages.includes(message)) {
          newErrorMessages.push(message);
        }
        continue;
      }
      runningCount += 1;
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      setErrors(newErrorMessages);
      return;
    }

    const results = await Promise.allSettled(
      validFiles.map(async (file) => ({
        id: crypto.randomUUID(),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        dataUrl: await readFileAsDataUrl(file),
      }))
    );

    const converted: InquiryAttachment[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        converted.push(result.value);
      } else if (!newErrorMessages.includes(readFailedMessage)) {
        newErrorMessages.push(readFailedMessage);
      }
    }

    setErrors(newErrorMessages);

    if (converted.length > 0) {
      onChange([...value, ...converted]);
    }
  }

  function handleRemove(attachmentId: string) {
    onChange(value.filter((attachment) => attachment.id !== attachmentId));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <Input
        id={inputId}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={handleChange}
      />
      {errors.map((message) => (
        <p key={message} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ))}
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-3">
          {value.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-2 rounded-md border border-input p-2 text-sm"
            >
              {attachment.fileType.startsWith("image/") && (
                // data URLはローカルのプレビューであり next/image の最適化対象外のため素の img を使う
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.dataUrl}
                  alt={attachment.fileName}
                  className="h-10 w-10 rounded object-cover"
                />
              )}
              <span className="max-w-[10rem] truncate">
                {attachment.fileName} ({formatFileSize(attachment.fileSize)})
              </span>
              <Button
                type="button"
                variant="outline"
                aria-label={`${removeButtonLabel}: ${attachment.fileName}`}
                onClick={() => handleRemove(attachment.id)}
              >
                {removeButtonLabel}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
