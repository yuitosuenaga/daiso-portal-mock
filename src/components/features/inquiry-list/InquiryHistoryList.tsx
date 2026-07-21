import { getTranslations, getLocale } from "next-intl/server";
import { getInquiryHistory } from "@/lib/api/inquiry-history";
import { AttachmentPreviewList } from "@/components/features/helpdesk-inquiries/AttachmentPreviewList";
import { getInquiryHistoryStyle } from "@/lib/inquiry-history-style";
import { cn } from "@/lib/utils";
import type { InquiryHistoryEntry } from "@/types/inquiry-history";

export interface InquiryHistoryListProps {
  inquiryId: string;
}

function getEntryLabel(
  type: InquiryHistoryEntry["type"],
  t: (key: string) => string
): string {
  switch (type) {
    case "reply_sent":
      return t("replyLabel");
    case "claimed":
      return t("claimedLabel");
    case "released":
      return t("releasedLabel");
    case "status_changed":
      return t("statusChangedLabel");
    case "requester_message":
      return t("requesterMessageLabel");
    default: {
      const exhaustiveCheck: never = type;
      return exhaustiveCheck;
    }
  }
}

function renderEntryBody(entry: InquiryHistoryEntry, t: (key: string) => string) {
  switch (entry.type) {
    case "reply_sent":
    case "requester_message":
      return (
        <>
          <p className="mt-1.5 whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2.5 text-sm">
            {entry.detail}
          </p>
          {entry.attachments && entry.attachments.length > 0 && (
            <div className="mt-1.5">
              <AttachmentPreviewList attachments={entry.attachments} />
            </div>
          )}
        </>
      );
    case "status_changed":
      return <p className="mt-1 text-sm">{entry.detail}</p>;
    case "claimed":
      return <p className="mt-1 text-sm">{t("claimedMessage")}</p>;
    case "released":
      return <p className="mt-1 text-sm">{t("releasedMessage")}</p>;
    default: {
      const exhaustiveCheck: never = entry.type;
      return exhaustiveCheck;
    }
  }
}

/**
 * 対応履歴を申請者向けに表示するコンポーネント。担当者名（`actorName`）は表示しない。
 */
export async function InquiryHistoryList({
  inquiryId,
}: InquiryHistoryListProps) {
  const [t, locale] = await Promise.all([
    getTranslations("inquiryList.history"),
    getLocale(),
  ]);

  let entries: InquiryHistoryEntry[];
  try {
    entries = await getInquiryHistory(inquiryId);
  } catch {
    return (
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {t("title")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("error")}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">
        {t("title")}
      </p>
      {entries.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="relative mt-3 space-y-4 before:absolute before:bottom-1 before:left-[13px] before:top-1 before:w-px before:bg-border before:content-['']">
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
                    {getEntryLabel(entry.type, t)}
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
                {renderEntryBody(entry, t)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
