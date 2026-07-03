import { AttachmentPreviewList } from "@/components/features/helpdesk-inquiries/AttachmentPreviewList";
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
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.id} className="text-sm">
          <span className="font-medium">{typeLabels[entry.type]}</span>
          <span className="text-muted-foreground">
            {" "}
            — <span>{entry.actorName}</span> /{" "}
            <time dateTime={entry.occurredAt}>
              {new Date(entry.occurredAt).toLocaleString(locale, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </span>
          {entry.detail && (
            <p className="text-xs text-muted-foreground">{entry.detail}</p>
          )}
          {entry.attachments && entry.attachments.length > 0 && (
            <div className="mt-1">
              <AttachmentPreviewList attachments={entry.attachments} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
