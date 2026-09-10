import type { Announcement } from "@/types/announcement";
import type { AnnouncementSelfStatus } from "@/types/announcement-recipient";

export interface AnnouncementSelfSummary {
  /** 集計対象（自社に配信対象が及ぶ公開中）のお知らせ総件数 */
  total: number;
  /** 本人が未確認の件数（対応要否は問わない） */
  unconfirmed: number;
  /** 本人は確認済みだが、要対応かつ自社の対応が未完了の件数 */
  confirmedActionPending: number;
}

/**
 * 申請者ダッシュボードのお知らせサマリ向けに、未確認件数・確認済み対応未完了件数を
 * 排他的に集計する（未確認かつ要対応の件は未確認側にのみ計上する。確認が先のステップのため）。
 * `selfStatusByAnnouncementId`に項目が無いお知らせは「未確認・未対応」として扱う
 * （`AnnouncementReadReceipt`はスパース保持のため、レコード未生成＝未確認と同義）。
 */
export function computeAnnouncementSelfSummary(
  announcements: Pick<Announcement, "id" | "actionRequired">[],
  selfStatusByAnnouncementId: ReadonlyMap<string, AnnouncementSelfStatus>
): AnnouncementSelfSummary {
  let unconfirmed = 0;
  let confirmedActionPending = 0;

  for (const announcement of announcements) {
    const status =
      selfStatusByAnnouncementId.get(announcement.id) ?? { confirmedAt: null, completedAt: null };

    if (status.confirmedAt === null) {
      unconfirmed += 1;
    } else if (announcement.actionRequired && status.completedAt === null) {
      confirmedActionPending += 1;
    }
  }

  return { total: announcements.length, unconfirmed, confirmedActionPending };
}
