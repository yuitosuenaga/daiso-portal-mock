import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isRecentlyCreated } from "@/lib/link-utils";
import type { LinkWithTimestamp } from "@/types/link";

export interface LinkItemProps {
  /** 表示対象のリンク1件分のデータ */
  link: LinkWithTimestamp;
  /** 日付表示に使用するロケール */
  locale: string;
  /** 「新しいタブで開きます」等の、翻訳済みのアクセシブルなテキスト */
  opensInNewTabLabel: string;
  /** 「新着」バッジの翻訳済みラベル */
  newBadgeLabel: string;
}

/**
 * リンク一覧の1件分を表示するコンポーネント。
 * クリックすると新しいタブでリンク先を開く（タブナビング対策として rel="noopener noreferrer" を付与）。
 * 説明文は改行を保持して表示し、登録日と新着バッジ（登録から7日以内）を表示する。
 */
export function LinkItem({
  link,
  locale,
  opensInNewTabLabel,
  newBadgeLabel,
}: LinkItemProps) {
  const isNew = isRecentlyCreated(link.createdAt);

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md border border-border p-3 transition-colors hover:bg-accent"
    >
      <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
        {link.title}
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{opensInNewTabLabel}</span>
        {isNew ? <Badge variant="default">{newBadgeLabel}</Badge> : null}
      </span>
      {link.description ? (
        <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
          {link.description}
        </p>
      ) : null}
      <time dateTime={link.createdAt} className="mt-1 block text-xs text-muted-foreground">
        {new Date(link.createdAt).toLocaleDateString(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </time>
    </a>
  );
}
