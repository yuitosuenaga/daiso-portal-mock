"use server";

import { revalidatePath } from "next/cache";

import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/lib/api/announcements";
import { announcementFormSchema } from "@/lib/validation/announcement";
import type { Announcement, CreateAnnouncementInput } from "@/types/announcement";

const HELPDESK_ANNOUNCEMENT_LIST_PATH = "/[locale]/helpdesk/announcements";
const HELPDESK_ANNOUNCEMENT_EDIT_PATH = "/[locale]/helpdesk/announcements/[id]/edit";
const APPLICANT_ANNOUNCEMENT_LIST_PATH = "/[locale]/announcements";
const APPLICANT_ANNOUNCEMENT_DETAIL_PATH = "/[locale]/announcements/[id]";
const DASHBOARD_PATH = "/[locale]";

function revalidateAnnouncementRoutes() {
  revalidatePath(HELPDESK_ANNOUNCEMENT_LIST_PATH, "page");
  revalidatePath(HELPDESK_ANNOUNCEMENT_EDIT_PATH, "page");
  revalidatePath(APPLICANT_ANNOUNCEMENT_LIST_PATH, "page");
  revalidatePath(APPLICANT_ANNOUNCEMENT_DETAIL_PATH, "page");
  revalidatePath(DASHBOARD_PATH, "page");
}

/**
 * お知らせを新規作成し、ヘルプデスク側・申請者側・ダッシュボードのルートを再検証する。
 * 不正な入力（タイトル・本文・種別の未入力、配信対象の国0件選択）は保存せず例外を送出する。
 */
export async function createAnnouncementAction(
  input: CreateAnnouncementInput
): Promise<Announcement> {
  const parsed = announcementFormSchema.parse(input);
  const created = await createAnnouncement(parsed);
  revalidateAnnouncementRoutes();

  return created;
}

/**
 * 既存お知らせの内容を更新し、ヘルプデスク側・申請者側・ダッシュボードのルートを再検証する。
 * 不正な入力は保存せず例外を送出する。
 */
export async function updateAnnouncementAction(
  id: string,
  input: CreateAnnouncementInput
): Promise<Announcement> {
  const parsed = announcementFormSchema.parse(input);
  const updated = await updateAnnouncement(id, parsed);
  revalidateAnnouncementRoutes();

  return updated;
}

/**
 * お知らせを削除し、ヘルプデスク側・申請者側・ダッシュボードのルートを再検証する。
 */
export async function deleteAnnouncementAction(id: string): Promise<void> {
  await deleteAnnouncement(id);
  revalidateAnnouncementRoutes();
}
