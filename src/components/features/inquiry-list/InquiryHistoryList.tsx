import { getTranslations, getLocale } from "next-intl/server";
import { getInquiryHistory } from "@/lib/api/inquiry-history";
import { AttachmentPreviewList } from "@/components/features/helpdesk-inquiries/AttachmentPreviewList";
import type { InquiryHistoryEntry } from "@/types/inquiry-history";

export interface InquiryHistoryListProps {
  inquiryId: string;
}

function renderEntryContent(
  entry: InquiryHistoryEntry,
  t: (key: string) => string
) {
  switch (entry.type) {
    case "reply_sent":
      return (
        <>
          <span className="font-medium">{t("replyLabel")}</span>
          <p className="mt-1 whitespace-pre-wrap">{entry.detail}</p>
          {entry.attachments && entry.attachments.length > 0 && (
            <div className="mt-1">
              <AttachmentPreviewList attachments={entry.attachments} />
            </div>
          )}
        </>
      );
    case "status_changed":
      return <p>{entry.detail}</p>;
    case "claimed":
      return <p>{t("claimedMessage")}</p>;
    case "released":
      return <p>{t("releasedMessage")}</p>;
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
        <ul className="mt-2 space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="text-sm">
              {renderEntryContent(entry, t)}
              <time
                dateTime={entry.occurredAt}
                className="text-xs text-muted-foreground"
              >
                {new Date(entry.occurredAt).toLocaleString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
