import type { StatsBarRow } from "@/lib/inquiry-breakdown";
import { withSharedBarScale } from "@/lib/inquiry-breakdown";
import type { Announcement } from "@/types/announcement";
import type { AnnouncementSelfStatus } from "@/types/announcement-recipient";

export interface AnnouncementSelfSummary {
  /** 集計対象（自社に配信対象が及ぶ公開中）のお知らせ総件数 */
  total: number;
  /** 本人が未確認の件数（対応要否は問わない） */
  unconfirmed: number;
  /** 本人は確認済みだが、要対応かつ自社の対応が未完了の件数 */
  confirmedActionPending: number;
  /** 確認済みで、要対応なら自社の対応も完了している（または元々対応不要）件数 */
  confirmedComplete: number;
}

/**
 * 申請者ダッシュボードのお知らせサマリ向けに、未確認・確認済み対応未完了・確認済み対応完了
 * （または元々対応不要）の3区分を排他的に集計する（3区分の合計は必ず`total`と一致する）。
 * 未確認かつ要対応の件はunconfirmed側にのみ計上する（確認が先のステップのため）。
 * `selfStatusByAnnouncementId`に項目が無いお知らせは「未確認」として扱う
 * （`AnnouncementReadReceipt`はスパース保持のため、レコード未生成＝未確認と同義）。
 */
export function computeAnnouncementSelfSummary(
  announcements: Pick<Announcement, "id" | "actionRequired">[],
  selfStatusByAnnouncementId: ReadonlyMap<string, AnnouncementSelfStatus>
): AnnouncementSelfSummary {
  let unconfirmed = 0;
  let confirmedActionPending = 0;
  let confirmedComplete = 0;

  for (const announcement of announcements) {
    const status =
      selfStatusByAnnouncementId.get(announcement.id) ?? { confirmedAt: null, completedAt: null };

    if (status.confirmedAt === null) {
      unconfirmed += 1;
    } else if (announcement.actionRequired && status.completedAt === null) {
      confirmedActionPending += 1;
    } else {
      confirmedComplete += 1;
    }
  }

  return { total: announcements.length, unconfirmed, confirmedActionPending, confirmedComplete };
}

const ANNOUNCEMENT_STATUS_SEGMENT_ORDER = [
  "unconfirmed",
  "confirmedActionPending",
  "confirmedComplete",
] as const;

export type AnnouncementStatusSegmentKey = (typeof ANNOUNCEMENT_STATUS_SEGMENT_ORDER)[number];

/** お知らせの対応状況3区分を横棒グラフ描画用の行データに変換する（3行固定、0件でも保持） */
export function toAnnouncementStatusBarRows(
  summary: AnnouncementSelfSummary,
  labels: Record<AnnouncementStatusSegmentKey, string>
): StatsBarRow[] {
  return withSharedBarScale(
    ANNOUNCEMENT_STATUS_SEGMENT_ORDER.map((key) => ({
      key,
      label: labels[key],
      count: summary[key],
    }))
  );
}

const ANNOUNCEMENT_CATEGORY_ORDER: Announcement["category"][] = [
  "maintenance",
  "policy",
  "incident",
  "other",
];

/** お知らせのカテゴリ別件数を、0件のカテゴリも0で埋めた固定キーで返す */
export function countAnnouncementsByCategory(
  announcements: Pick<Announcement, "category">[]
): Record<Announcement["category"], number> {
  const result: Record<Announcement["category"], number> = {
    maintenance: 0,
    policy: 0,
    incident: 0,
    other: 0,
  };
  for (const announcement of announcements) {
    result[announcement.category] += 1;
  }
  return result;
}

/** お知らせのカテゴリ別件数を横棒グラフ描画用の行データに変換する（4行固定、0件でも保持） */
export function toAnnouncementCategoryBarRows(
  byCategory: Record<Announcement["category"], number>,
  categoryLabels: Record<Announcement["category"], string>
): StatsBarRow[] {
  return withSharedBarScale(
    ANNOUNCEMENT_CATEGORY_ORDER.map((category) => ({
      key: category,
      label: categoryLabels[category],
      count: byCategory[category],
    }))
  );
}
