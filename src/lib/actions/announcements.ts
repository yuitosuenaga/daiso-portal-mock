"use server";

import { revalidatePath } from "next/cache";

import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/lib/api/announcements";
import { announcementFormSchema } from "@/lib/validation/announcement";
import { ensureEnTranslation } from "@/lib/server/announcement-translation";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import { getTranslator } from "@/lib/server/translation-service";
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
  const withEnTranslation = await ensureEnTranslation(parsed);
  const created = await createAnnouncement(withEnTranslation);
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
  const withEnTranslation = await ensureEnTranslation(parsed, id);
  const updated = await updateAnnouncement(id, withEnTranslation);
  revalidateAnnouncementRoutes();

  return updated;
}

/**
 * フォーム編集中のja本文をClaude APIで即時翻訳し、英語欄に反映するための下書き翻訳。
 * 保存は行わない（フォームの「日本語から自動翻訳」ボタン用）。
 */
export async function translateAnnouncementDraftAction(input: {
  title: string;
  body: string;
}): Promise<{ title: string; body: string }> {
  await requireHelpdeskStaffSession();

  const translator = getTranslator();
  if (!translator) {
    throw new Error("Automatic translation is not configured");
  }

  return translator.translate({
    title: input.title,
    body: input.body,
    sourceLocale: "ja",
    targetLocale: "en",
  });
}

/**
 * お知らせを削除し、ヘルプデスク側・申請者側・ダッシュボードのルートを再検証する。
 */
export async function deleteAnnouncementAction(id: string): Promise<void> {
  await deleteAnnouncement(id);
  revalidateAnnouncementRoutes();
}
