import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /**
   * `true` の場合、ラベル末尾に必須であることを示す視覚的インジケーターを表示する。
   */
  required?: boolean;
  /**
   * 必須インジケーターとして表示するReactNode（例: 翻訳キー経由の「必須」バッジ）。
   * 未指定の場合は赤いアスタリスクをデフォルトとして表示する。
   */
  requiredIndicator?: React.ReactNode;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, requiredIndicator, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-destructive" aria-hidden="true">
          *
        </span>
      )}
      {required && requiredIndicator && (
        <span className="sr-only">{requiredIndicator}</span>
      )}
    </label>
  )
);
Label.displayName = "Label";

export { Label };
