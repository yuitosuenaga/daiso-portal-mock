import { requireApplicantSession, requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import {
  findAnnouncementVisibleToCountry,
  getAnnouncementRecipientStatuses as getAnnouncementRecipientStatusesService,
  getAnnouncementSelfStatusForCompany as getAnnouncementSelfStatusForCompanyService,
  getAnnouncementTrackingSummary as getAnnouncementTrackingSummaryService,
  isReminderPendingForCompany as isReminderPendingForCompanyService,
  recordCompanyCompletion as recordCompanyCompletionService,
  recordCompanyConfirmation as recordCompanyConfirmationService,
  sendAnnouncementReminders as sendAnnouncementRemindersService,
} from "@/lib/server/announcement-service";
import type {
  AnnouncementRecipientStatusView,
  AnnouncementSelfStatus,
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

/**
 * 申請者セッションの自社について、お知らせの確認済みを記録する。companyCodeは
 * クライアント入力を受け取らず、セッションクレームから取得する（なりすまし防止）。
 * 対象お知らせが下書き・配信対象外・公開期間外・存在しないいずれかに該当する場合は
 * 何も記録せず正常終了する。
 */
export async function confirmAnnouncementForCurrentCompany(
  id: string
): Promise<AnnouncementSelfStatus> {
  const { claims } = await requireApplicantSession();

  const announcement = await findAnnouncementVisibleToCountry(id, claims.country);
  if (announcement) {
    await recordCompanyConfirmationService(id, claims.companyCode);
  }

  return getAnnouncementSelfStatusForCompanyService(id, claims.companyCode);
}

/**
 * 申請者セッションの自社について、お知らせの対応完了を記録する。companyCodeは
 * クライアント入力を受け取らず、セッションクレームから取得する（なりすまし防止）。
 * 対象お知らせが下書き・配信対象外・公開期間外・存在しないいずれかに該当する場合、
 * または対応要否（`actionRequired`）が偽の場合は何も記録せず正常終了する。
 */
export async function completeAnnouncementForCurrentCompany(
  id: string
): Promise<AnnouncementSelfStatus> {
  const { claims } = await requireApplicantSession();

  const announcement = await findAnnouncementVisibleToCountry(id, claims.country);
  if (announcement?.actionRequired) {
    await recordCompanyCompletionService(id, claims.companyCode);
  }

  return getAnnouncementSelfStatusForCompanyService(id, claims.companyCode);
}

/**
 * 申請者セッションの自社について、お知らせの確認済み・実施済み状態を取得する。
 */
export async function getAnnouncementSelfStatus(id: string): Promise<AnnouncementSelfStatus> {
  const { claims } = await requireApplicantSession();

  return getAnnouncementSelfStatusForCompanyService(id, claims.companyCode);
}
