import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  /** 表示済みのラベル文字列（翻訳解決は呼び出し側の責務） */
  label: string;
  /** 必須項目かどうか。trueの場合、ラベルに必須インジケーターを表示する */
  required?: boolean;
  /** 必須インジケーターとして表示する、翻訳済みのアクセシブルなテキスト（例: 「必須」） */
  requiredIndicator?: React.ReactNode;
  /** 表示済みのエラーメッセージ文字列（翻訳解決は呼び出し側の責務） */
  error?: string;
  /** ラベルと関連付けるフォーム要素のid */
  htmlFor?: string;
  /** ラップ対象の入力コンポーネント（Input/Textarea/Select等） */
  children: React.ReactNode;
  className?: string;
}

/**
 * ラベル・必須インジケーター・エラーメッセージ表示を統一する共有ラッパーコンポーネント。
 * `next-intl` のフックは呼ばず、翻訳済み文字列をpropとして受け取る。
 */
export function FormField({
  label,
  required,
  requiredIndicator,
  error,
  htmlFor,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} required={required} requiredIndicator={requiredIndicator}>
        {label}
      </Label>
      {children}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
