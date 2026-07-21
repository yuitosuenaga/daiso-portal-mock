import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import type { Inquiry } from "@/types/inquiry";

export interface HelpdeskInquiryListItemProps {
  inquiry: Inquiry;
  categoryLabel: string;
  urgencyLabel: string;
  statusLabel: string;
  countryLabel: string;
  claimBadgeLabel: string;
  claimedByLabel: string;
  locale: string;
  /** `inquiry.title`が空文字の場合に表示する代替ラベル */
  untitledLabel: string;
}

/**
 * ヘルプデスク側問い合わせ一覧の1行分を表示するコンポーネント。
 * 申請者側の一覧行と異なり、会社名・国・対応中フラグを表示する。
 */
export function HelpdeskInquiryListItem({
  inquiry,
  categoryLabel,
  urgencyLabel,
  statusLabel,
  countryLabel,
  claimBadgeLabel,
  claimedByLabel,
  locale,
  untitledLabel,
}: HelpdeskInquiryListItemProps) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 space-y-1">
        <Link
          href={`/helpdesk/inquiries/${inquiry.id}`}
          className="text-sm font-medium hover:underline"
        >
          {inquiry.title || untitledLabel}
        </Link>
        <p className="text-xs text-muted-foreground">
          {inquiry.submittedBy.companyName} / {categoryLabel}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={`status-${inquiry.status}`}>{statusLabel}</Badge>
          <Badge variant={`urgency-${inquiry.urgency}`}>{urgencyLabel}</Badge>
          {inquiry.claim && (
            <Badge variant="default">
              {claimBadgeLabel}: {claimedByLabel} {inquiry.claim.staffName}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{countryLabel}</span>
          <span className="text-xs text-muted-foreground">
            {inquiry.storeRegion}
          </span>
          <time
            dateTime={inquiry.createdAt}
            className="text-xs text-muted-foreground"
          >
            {new Date(inquiry.createdAt).toLocaleDateString(locale, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </time>
        </div>
      </div>
    </li>
  );
}
