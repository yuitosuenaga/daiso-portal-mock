import { ExternalLink } from "lucide-react";
import type { Link } from "@/types/link";

export interface LinkItemProps {
  /** 表示対象のリンク1件分のデータ */
  link: Link;
  /** 「新しいタブで開きます」等の、翻訳済みのアクセシブルなテキスト */
  opensInNewTabLabel: string;
}

/**
 * リンク一覧の1件分を表示するコンポーネント。
 * クリックすると新しいタブでリンク先を開く（タブナビング対策として rel="noopener noreferrer" を付与）。
 */
export function LinkItem({ link, opensInNewTabLabel }: LinkItemProps) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md border border-border p-3 transition-colors hover:bg-accent"
    >
      <span className="flex items-center gap-1.5 text-sm font-medium">
        {link.title}
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{opensInNewTabLabel}</span>
      </span>
      {link.description ? (
        <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>
      ) : null}
    </a>
  );
}
