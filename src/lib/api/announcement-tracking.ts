import { requireApplicantSession, requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import {
  findAnnouncementVisibleToCountry,
  getAnnouncementRecipientStatuses as getAnnouncementRecipientStatusesService,
  getAnnouncementSelfStatusForCompany as getAnnouncementSelfStatusForCompanyService,
  getAnnouncementTrackingSummary as getAnnouncementTrackingSummaryService,
  getAnnouncementUserReadStatuses as getAnnouncementUserReadStatusesService,
  getUserSelfConfirmation as getUserSelfConfirmationService,
  isReminderPendingForCompany as isReminderPendingForCompanyService,
  recordCompanyCompletion as recordCompanyCompletionService,
  recordUserConfirmation as recordUserConfirmationService,
  sendAnnouncementReminders as sendAnnouncementRemindersService,
  sendUserReadReminders as sendUserReadRemindersService,
} from "@/lib/server/announcement-service";
import type {
  AnnouncementRecipientStatusView,
  AnnouncementSelfStatus,
  AnnouncementTrackingSummary,
  AnnouncementUserReadStatusView,
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
 * 指定したお知らせの確認済みトラッキング対象母集団（配信対象の国に属し`isActive: true`の
 * `ApplicantUser`）を、個人受信レシートと結合した一覧で返す（要件39.4）。
 * ヘルプデスク側お知らせ管理一覧の確認モードダイアログが利用する。
 */
export async function getAnnouncementUserReadStatuses(
  announcementId: string
): Promise<AnnouncementUserReadStatusView[]> {
  await requireHelpdeskStaffSession();

  return getAnnouncementUserReadStatusesService(announcementId);
}

/**
 * 対象の`ApplicantUser`へ個人単位の既読リマインドを送信したことを記録する。
 * 既に確認済みの`ApplicantUser`はリマインド対象から除外される（要件39.6）。
 */
export async function sendAnnouncementUserReadReminders(
  announcementId: string,
  applicantUserIds: string[]
): Promise<void> {
  await requireHelpdeskStaffSession();

  return sendUserReadRemindersService(announcementId, applicantUserIds);
}

/**
 * 申請者セッションの本人について、お知らせの確認済みを記録する。`applicantUserId`は
 * クライアント入力を受け取らず、セッションクレームから取得する（なりすまし防止）。
 * 記録は本人単位であり、同一会社の他の`ApplicantUser`の既読状態には影響しない（要件18.1）。
 * 対象お知らせが下書き・配信対象外・公開期間外・存在しないいずれかに該当する場合は
 * 何も記録せず正常終了する。
 */
export async function confirmAnnouncementForCurrentCompany(
  id: string
): Promise<AnnouncementSelfStatus> {
  const { claims } = await requireApplicantSession();

  const announcement = await findAnnouncementVisibleToCountry(id, claims.country);
  if (announcement) {
    await recordUserConfirmationService(id, claims.applicantUserId);
  }

  return getAnnouncementSelfStatus(id);
}

/**
 * 申請者セッションの自社について、お知らせの対応完了を記録する。companyCodeは
 * クライアント入力を受け取らず、セッションクレームから取得する（なりすまし防止）。
 * 対象お知らせが下書き・配信対象外・公開期間外・存在しないいずれかに該当する場合、
 * または対応要否（`actionRequired`）が偽の場合は何も記録せず正常終了する。実施済み
 * （対応完了）は引き続き会社単位のまま（要件18.5）。
 */
export async function completeAnnouncementForCurrentCompany(
  id: string
): Promise<AnnouncementSelfStatus> {
  const { claims } = await requireApplicantSession();

  const announcement = await findAnnouncementVisibleToCountry(id, claims.country);
  if (announcement?.actionRequired) {
    await recordCompanyCompletionService(id, claims.companyCode);
  }

  return getAnnouncementSelfStatus(id);
}

/**
 * 申請者セッションの自己状態を取得する。`confirmedAt`は本人（`ApplicantUser`）の既読、
 * `completedAt`は所属会社の対応完了状態から合成して返す（要件18.3）。
 */
export async function getAnnouncementSelfStatus(id: string): Promise<AnnouncementSelfStatus> {
  const { claims } = await requireApplicantSession();

  const [confirmedAt, { completedAt }] = await Promise.all([
    getUserSelfConfirmationService(id, claims.applicantUserId),
    getAnnouncementSelfStatusForCompanyService(id, claims.companyCode),
  ]);

  return { confirmedAt, completedAt };
}
