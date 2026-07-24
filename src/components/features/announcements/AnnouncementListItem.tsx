import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { ReminderBadge } from "@/components/features/announcements/ReminderBadge";
import { OverdueBadge } from "@/components/features/announcements/OverdueBadge";
import {
  CompletedStatusBadge,
  ConfirmedStatusBadge,
} from "@/components/features/announcements/SelfReportStatusBadges";
import { isAnnouncementDueDateOverdue } from "@/lib/announcement-overdue";
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
   * 自社が既に確認済みかどうか（読み取り専用）。
   * 未指定の場合は確認済みバッジを表示しない（ダッシュボードのプレビュー等、
   * バッジ表示が不要な文脈のため省略可能）。本コンポーネントはこの値の記録トリガーを持たない。
   */
  selfConfirmed?: boolean;
  /**
   * 自社が既に対応完了済みかどうか（読み取り専用）。`announcement.actionRequired`が
   * 真の場合のみバッジ表示に使用する。未指定の場合は対応完了バッジを表示しない。
   * 本コンポーネントはこの値の記録トリガーを持たない。
   */
  selfCompleted?: boolean;
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
  selfConfirmed,
  selfCompleted,
  showBodyExcerpt,
  locale,
}: AnnouncementListItemProps) {
  // 意図的な挙動（要件17.8）: ダッシュボードプレビュー等、対応完了状態(selfCompleted)を
  // 保持しない表示文脈ではこのpropが未指定(undefined)になる。その場合`!selfCompleted`は
  // 常にtrueとなり、完了抑止（要件4）は適用されず、対応期限が超過していれば期限超過表示が
  // 行われる。当該文脈は完了状態を参照できないため、日付ベースの表示を優先する仕様。
  const isOverdue =
    announcement.actionRequired &&
    isAnnouncementDueDateOverdue(announcement.dueDate) &&
    !selfCompleted;

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
          {selfConfirmed && <ConfirmedStatusBadge isConfirmed={selfConfirmed} />}
          {announcement.actionRequired && selfCompleted && (
            <CompletedStatusBadge isCompleted={selfCompleted} />
          )}
          {announcement.actionRequired && announcement.dueDate && dueDateLabel && (
            <span
              className={
                isOverdue
                  ? "text-xs font-medium text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {dueDateLabel}:{" "}
              {new Date(announcement.dueDate).toLocaleDateString(locale, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          <OverdueBadge isOverdue={isOverdue} />
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
