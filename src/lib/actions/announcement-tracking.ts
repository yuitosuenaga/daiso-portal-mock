"use server";

import { revalidatePath } from "next/cache";

import { sendAnnouncementReminders } from "@/lib/api/announcement-tracking";

const HELPDESK_ANNOUNCEMENT_LIST_PATH = "/[locale]/helpdesk/announcements";
const APPLICANT_ANNOUNCEMENT_LIST_PATH = "/[locale]/announcements";
const APPLICANT_ANNOUNCEMENT_DETAIL_PATH = "/[locale]/announcements/[id]";

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

  revalidatePath(HELPDESK_ANNOUNCEMENT_LIST_PATH, "page");
  revalidatePath(APPLICANT_ANNOUNCEMENT_LIST_PATH, "page");
  revalidatePath(APPLICANT_ANNOUNCEMENT_DETAIL_PATH, "page");
}
