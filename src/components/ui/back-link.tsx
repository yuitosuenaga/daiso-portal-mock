import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface BackLinkProps {
  href: string;
  label: string;
  className?: string;
}

/**
 * 詳細・編集・新規作成など下位画面の左上に置く、前の画面へ戻るリンク。
 */
export function BackLink({ href, label, className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
