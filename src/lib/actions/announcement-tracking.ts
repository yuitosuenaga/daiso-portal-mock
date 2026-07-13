"use server";

import { revalidatePath } from "next/cache";

import {
  completeAnnouncementForCurrentCompany,
  confirmAnnouncementForCurrentCompany,
  sendAnnouncementReminders,
} from "@/lib/api/announcement-tracking";
import type { AnnouncementSelfStatus } from "@/types/announcement-recipient";

const HELPDESK_ANNOUNCEMENT_LIST_PATH = "/[locale]/helpdesk/announcements";
const APPLICANT_ANNOUNCEMENT_LIST_PATH = "/[locale]/announcements";
const APPLICANT_ANNOUNCEMENT_DETAIL_PATH = "/[locale]/announcements/[id]";

function revalidateAnnouncementTrackingRoutes(): void {
  revalidatePath(HELPDESK_ANNOUNCEMENT_LIST_PATH, "page");
  revalidatePath(APPLICANT_ANNOUNCEMENT_LIST_PATH, "page");
  revalidatePath(APPLICANT_ANNOUNCEMENT_DETAIL_PATH, "page");
}

/**
 * 未対応の担当者へリマインドを送信したことをモックデータ上に記録する。
 * 実際のメール・プッシュ通知配信は行わない。空配列を渡した場合は何もせず正常終了する。
 */
export async function sendAnnouncementRemindersAction(
  announcementId: string,
  recipientIds: string[]
): Promise<void> {
  if (recipientIds.length === 0) {
    return;
  }

  await sendAnnouncementReminders(announcementId, recipientIds);

  revalidateAnnouncementTrackingRoutes();
}

/**
 * 申請者（自社）の確認済みを記録し、関連ルートを再検証する。
 * 対象お知らせが下書き・配信対象外・公開期間外・存在しないいずれかに該当する場合は
 * 何も記録せず、記録前と同じ最新の自己申告状態を返す。
 */
export async function confirmAnnouncementAction(
  announcementId: string
): Promise<AnnouncementSelfStatus> {
  const status = await confirmAnnouncementForCurrentCompany(announcementId);

  revalidateAnnouncementTrackingRoutes();

  return status;
}

/**
 * 申請者（自社）の対応完了を記録し、関連ルートを再検証する。
 * 対象お知らせが下書き・配信対象外・公開期間外・存在しない、または対応要否が偽の
 * いずれかに該当する場合は何も記録せず、記録前と同じ最新の自己申告状態を返す。
 */
export async function completeAnnouncementAction(
  announcementId: string
): Promise<AnnouncementSelfStatus> {
  const status = await completeAnnouncementForCurrentCompany(announcementId);

  revalidateAnnouncementTrackingRoutes();

  return status;
}
