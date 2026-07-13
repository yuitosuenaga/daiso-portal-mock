import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { ReminderBadge } from "@/components/features/announcements/ReminderBadge";
import type { Announcement } from "@/types/announcement";

export interface AnnouncementListItemProps {
  /** 表示対象のお知らせ1件分のデータ */
  announcement: Announcement;
  /** 種別（category）の翻訳済み表示ラベル */
  categoryLabel: string;
  /**
   * 対応要否バッジの翻訳済み表示ラベル。
   * 未指定の場合は対応要否バッジを表示しない（ダッシュボードのプレビュー等、
   * バッジ表示が不要な文脈のため省略可能）。
   */
  actionRequiredBadgeLabel?: string;
  /**
   * 対応期限のラベル文言。未指定の場合は対応期限を表示しない（ダッシュボードのプレビュー等、
   * 表示が不要な文脈のため省略可能）。
   */
  dueDateLabel?: string;
  /**
   * 自社宛に未対応のままリマインドが送信されているかどうか。
   * 未指定の場合はリマインド受信バッジを表示しない（ダッシュボードのプレビュー等、
   * バッジ表示が不要な文脈のため省略可能）。
   */
  isReminderPending?: boolean;
  /**
   * タイトルとバッジ行の間に本文（`announcement.body`）の要約を2行まで表示するかどうか。
   * 未指定の場合は表示しない（一覧画面等、既存の見た目を維持する文脈のため省略可能）。
   */
  showBodyExcerpt?: boolean;
  /** 公開日のロケール整形に使用する現在のロケール */
  locale: string;
}

/**
 * お知らせ一覧の1行分を表示するコンポーネント。
 * タイトルは詳細画面（/announcements/[id]）へのリンクとする。
 */
export function AnnouncementListItem({
  announcement,
  categoryLabel,
  actionRequiredBadgeLabel,
  dueDateLabel,
  isReminderPending,
  showBodyExcerpt,
  locale,
}: AnnouncementListItemProps) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 space-y-1">
        <Link
          href={`/announcements/${announcement.id}`}
          className="text-sm font-medium hover:underline"
        >
          {announcement.title}
        </Link>
        {showBodyExcerpt && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {announcement.body}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={announcement.category}>{categoryLabel}</Badge>
          {announcement.actionRequired && actionRequiredBadgeLabel && (
            <Badge variant="default">{actionRequiredBadgeLabel}</Badge>
          )}
          {isReminderPending && <ReminderBadge isPending={isReminderPending} />}
          {announcement.actionRequired && announcement.dueDate && dueDateLabel && (
            <span className="text-xs text-muted-foreground">
              {dueDateLabel}:{" "}
              {new Date(announcement.dueDate).toLocaleDateString(locale, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          <time
            dateTime={announcement.publishedAt!}
            className="text-xs text-muted-foreground"
          >
            {new Date(announcement.publishedAt!).toLocaleDateString(locale, {
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
