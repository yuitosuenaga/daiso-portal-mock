"use server";

import { revalidatePath } from "next/cache";

import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/lib/api/announcements";
import { announcementFormSchema } from "@/lib/validation/announcement";
import { buildAnnouncementTranslations } from "@/lib/server/announcement-translation";
import {
  AnnouncementNotFoundError,
  findAnnouncementById,
  replaceAnnouncementTranslations,
} from "@/lib/server/announcement-service";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
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

/** フォームから受け取る入力。翻訳は保存時にjaから自動生成するため`translations`は含まない。 */
export type AnnouncementActionInput = Omit<CreateAnnouncementInput, "translations">;

export interface AnnouncementSaveResult {
  announcement: Announcement;
  /** 自動翻訳に失敗したlocale。空なら全言語の翻訳が保存済み */
  failedLocales: string[];
  /** 翻訳失敗のため、指定された公開状態に関わらず下書きとして保存した場合に真 */
  forcedDraft: boolean;
}

/**
 * ja本文から全対応言語の翻訳を組み立て、1言語でも失敗したら公開状態を強制的に下書きにする
 * （下書きなら公開通知は送られない）。
 */
async function withAutoTranslations(
  parsed: ReturnType<typeof announcementFormSchema.parse>,
  existingId?: string
): Promise<{ input: CreateAnnouncementInput; failedLocales: string[]; forcedDraft: boolean }> {
  const values = parsed;
  const existing = existingId ? await findAnnouncementById(existingId) : null;
  const { translations, failedLocales } = await buildAnnouncementTranslations(
    { title: values.title, body: values.body },
    existing?.translations ?? []
  );
  const forcedDraft = failedLocales.length > 0 && values.status === "published";

  return {
    input: { ...values, status: failedLocales.length > 0 ? "draft" : values.status, translations },
    failedLocales,
    forcedDraft,
  };
}

/**
 * お知らせを新規作成し、ヘルプデスク側・申請者側・ダッシュボードのルートを再検証する。
 * 不正な入力（タイトル・本文・種別の未入力、配信対象の国0件選択）は保存せず例外を送出する。
 * 翻訳に失敗した場合は下書きとして保存する（`failedLocales`・`forcedDraft`で通知）。
 */
export async function createAnnouncementAction(
  input: AnnouncementActionInput
): Promise<AnnouncementSaveResult> {
  const parsed = announcementFormSchema.parse(input);
  const { input: prepared, failedLocales, forcedDraft } = await withAutoTranslations(parsed);
  const created = await createAnnouncement(prepared);
  revalidateAnnouncementRoutes();

  return { announcement: created, failedLocales, forcedDraft };
}

/**
 * 既存お知らせの内容を更新し、ヘルプデスク側・申請者側・ダッシュボードのルートを再検証する。
 * 不正な入力は保存せず例外を送出する。jaのタイトル・本文が変わった場合のみ再翻訳する。
 */
export async function updateAnnouncementAction(
  id: string,
  input: AnnouncementActionInput
): Promise<AnnouncementSaveResult> {
  const parsed = announcementFormSchema.parse(input);
  const { input: prepared, failedLocales, forcedDraft } = await withAutoTranslations(parsed, id);
  const updated = await updateAnnouncement(id, prepared);
  revalidateAnnouncementRoutes();

  return { announcement: updated, failedLocales, forcedDraft };
}

/**
 * 翻訳APIだけを再実行する。不足・古い・失敗したlocaleのみ翻訳して保存し、
 * 公開状態・通知には触れない。翻訳に失敗したlocaleの既存行は残す。
 */
export async function retranslateAnnouncementAction(
  id: string
): Promise<{ failedLocales: string[] }> {
  await requireHelpdeskStaffSession();

  const current = await findAnnouncementById(id);
  if (!current) {
    throw new AnnouncementNotFoundError(id);
  }

  const { translations, failedLocales } = await buildAnnouncementTranslations(
    { title: current.title, body: current.body },
    current.translations,
    { keepExistingOnFailure: true }
  );
  await replaceAnnouncementTranslations(id, translations);
  revalidateAnnouncementRoutes();

  return { failedLocales };
}

/**
 * お知らせを削除し、ヘルプデスク側・申請者側・ダッシュボードのルートを再検証する。
 */
export async function deleteAnnouncementAction(id: string): Promise<void> {
  await deleteAnnouncement(id);
  revalidateAnnouncementRoutes();
}
