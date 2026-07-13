import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import {
  getAnnouncementRecipientStatuses as getAnnouncementRecipientStatusesService,
  getAnnouncementTrackingSummary as getAnnouncementTrackingSummaryService,
  isReminderPendingForCompany as isReminderPendingForCompanyService,
  sendAnnouncementReminders as sendAnnouncementRemindersService,
} from "@/lib/server/announcement-service";
import type {
  AnnouncementRecipientStatusView,
  AnnouncementTrackingSummary,
} from "@/types/announcement-recipient";

/**
 * 指定したお知らせの配信対象（`targeting`）でスコープされた担当者について、
 * 確認済み・実施済み・リマインド送信状態を結合した一覧を返す。
 * 該当お知らせが存在しない場合は空配列を返す。ヘルプデスク側の管理画面が利用する。
 */
export async function getAnnouncementRecipientStatuses(
  announcementId: string
): Promise<AnnouncementRecipientStatusView[]> {
  await requireHelpdeskStaffSession();

  return getAnnouncementRecipientStatusesService(announcementId);
}

/**
 * 指定したお知らせの確認済み・実施済み人数を集計する。
 * `actionRequired`が偽のお知らせでは`completedCount`は`null`を返す。
 */
export async function getAnnouncementTrackingSummary(
  announcementId: string
): Promise<AnnouncementTrackingSummary> {
  await requireHelpdeskStaffSession();

  return getAnnouncementTrackingSummaryService(announcementId);
}

/**
 * 指定した会社コードに属する担当者について、未対応のまま
 * リマインドが送信されている担当者が1名以上存在するかを判定する。
 * 海外販社側のリマインド受信表示が参照する（申請者セッションから呼ばれる）。
 */
export async function isReminderPendingForCompany(
  announcementId: string,
  companyCode: string
): Promise<boolean> {
  return isReminderPendingForCompanyService(announcementId, companyCode);
}

/**
 * 対象担当者へリマインドを送信したことを記録する。
 * 実際の通知配信は行わない。既存のステータスレコードがない担当者については新規作成する。
 */
export async function sendAnnouncementReminders(
  announcementId: string,
  recipientIds: string[]
): Promise<void> {
  await requireHelpdeskStaffSession();

  return sendAnnouncementRemindersService(announcementId, recipientIds);
}
