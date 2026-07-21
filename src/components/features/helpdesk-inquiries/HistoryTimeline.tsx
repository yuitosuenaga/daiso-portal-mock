import { AttachmentPreviewList } from "@/components/features/helpdesk-inquiries/AttachmentPreviewList";
import { getInquiryHistoryStyle } from "@/lib/inquiry-history-style";
import { cn } from "@/lib/utils";
import type {
  InquiryHistoryEntry,
  InquiryHistoryEntryType,
} from "@/types/inquiry-history";

export interface HistoryTimelineProps {
  /** `getInquiryHistory` が返す発生時刻降順のエントリ一覧 */
  entries: InquiryHistoryEntry[];
  emptyMessage: string;
  typeLabels: Record<InquiryHistoryEntryType, string>;
  locale: string;
}

/**
 * 対応履歴を新しい順に、操作内容・操作者・操作日時とともに表示する。
 */
export function HistoryTimeline({
  entries,
  emptyMessage,
  typeLabels,
  locale,
}: HistoryTimelineProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="relative space-y-4 before:absolute before:bottom-1 before:left-[13px] before:top-1 before:w-px before:bg-border before:content-['']">
      {entries.map((entry) => {
        const style = getInquiryHistoryStyle(entry.type);
        const Icon = style.icon;
        return (
          <li key={entry.id} className="relative pl-9 text-sm">
            <span
              className={cn(
                "absolute left-0 top-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2",
                style.markerClassName
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-semibold",
                  style.badgeClassName
                )}
              >
                {typeLabels[entry.type]}
              </span>
              <span className="text-xs text-muted-foreground">
                {entry.actorName}
              </span>
              <time
                dateTime={entry.occurredAt}
                className="font-mono text-xs tabular-nums text-muted-foreground"
              >
                {new Date(entry.occurredAt).toLocaleString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
            {entry.detail && (
              <p className="mt-1.5 whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2.5 text-xs">
                {entry.detail}
              </p>
            )}
            {entry.attachments && entry.attachments.length > 0 && (
              <div className="mt-1.5">
                <AttachmentPreviewList attachments={entry.attachments} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
