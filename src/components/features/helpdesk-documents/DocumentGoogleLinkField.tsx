"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface DocumentGoogleLinkFieldProps {
  value: string;
  onChange: (googleUrl: string) => void;
  label: string;
  hint: string;
  placeholder: string;
  /** 呼び出し側（`react-hook-form`のerrors）が判定した検証結果。エラーメッセージ自体は
   *  呼び出し側の`FormField`が表示するため、本コンポーネントは`aria-invalid`のみに用いる。 */
  invalid?: boolean;
  id?: string;
}

/**
 * Googleドキュメント/スプレッドシート/スライドの共有リンクURLを入力するフィールド。
 * `DocumentFileField`と排他的に表示される。エラーメッセージの表示は呼び出し側の
 * `FormField`に一本化し、本コンポーネント自身では表示しない（同一メッセージの二重表示を避けるため）。
 */
export function DocumentGoogleLinkField({
  value,
  onChange,
  label,
  hint,
  placeholder,
  invalid,
  id,
}: DocumentGoogleLinkFieldProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <Input
        id={inputId}
        type="url"
        placeholder={placeholder}
        value={value}
        aria-invalid={invalid ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
