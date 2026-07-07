import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={announcement.category}>{categoryLabel}</Badge>
          {announcement.actionRequired && actionRequiredBadgeLabel && (
            <Badge variant="default">{actionRequiredBadgeLabel}</Badge>
          )}
          <time
            dateTime={announcement.publishedAt}
            className="text-xs text-muted-foreground"
          >
            {new Date(announcement.publishedAt).toLocaleDateString(locale, {
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
