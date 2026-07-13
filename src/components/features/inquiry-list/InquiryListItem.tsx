import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import type { Inquiry } from "@/types/inquiry";

export interface InquiryListItemProps {
  /** 表示対象の問い合わせ1件分のデータ */
  inquiry: Inquiry;
  /** 案件種別（category）の翻訳済み表示ラベル */
  categoryLabel: string;
  /** 緊急度（urgency）の翻訳済み表示ラベル */
  urgencyLabel: string;
  /** 対応状況（status）の翻訳済み表示ラベル */
  statusLabel: string;
  /** 「対応状況」ラベル自体の翻訳済み表示名（バッジのaria-labelに使用） */
  statusFieldLabel: string;
  /** 「緊急度」ラベル自体の翻訳済み表示名（バッジのaria-labelに使用） */
  urgencyFieldLabel: string;
  /** 送信日時のロケール整形に使用する現在のロケール */
  locale: string;
  /** inquiry.titleが空文字の場合に表示する代替ラベル */
  untitledLabel: string;
}

/**
 * 問い合わせ一覧の1行分を表示するコンポーネント。
 * タイトルは詳細画面（/inquiry/[id]）へのリンクとし、直下に本文（originalText）の
 * 2行プレビューを表示する。案件種別は対応状況・緊急度と同様にバッジとして表示する。
 */
export function InquiryListItem({
  inquiry,
  categoryLabel,
  urgencyLabel,
  statusLabel,
  statusFieldLabel,
  urgencyFieldLabel,
  locale,
  untitledLabel,
}: InquiryListItemProps) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 space-y-1">
        <Link
          href={`/inquiry/${inquiry.id}`}
          className="text-sm font-medium hover:underline"
        >
          {inquiry.title || untitledLabel}
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {inquiry.originalText}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="muted">{categoryLabel}</Badge>
          <Badge
            variant={`status-${inquiry.status}`}
            aria-label={`${statusFieldLabel}: ${statusLabel}`}
          >
            {statusLabel}
          </Badge>
          <Badge
            variant={`urgency-${inquiry.urgency}`}
            aria-label={`${urgencyFieldLabel}: ${urgencyLabel}`}
          >
            {urgencyLabel}
          </Badge>
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
