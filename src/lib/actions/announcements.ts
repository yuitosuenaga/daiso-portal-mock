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
  AnnouncementTargetUsersNotFoundError,
  findAnnouncementById,
  normalizeTargeting,
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

/**
 * フォームから受け取る入力。翻訳は保存時にjaから自動生成するため`translations`は含まない。
 * `publishWithoutTranslation`が真なら、翻訳に失敗しても強制的に下書きにせず公開で保存する。
 */
export type AnnouncementActionInput = Omit<CreateAnnouncementInput, "translations"> & {
  publishWithoutTranslation?: boolean;
};

export interface AnnouncementSaveResult {
  announcement: Announcement;
  /** 自動翻訳に失敗したlocale。空なら全言語の翻訳が保存済み */
  failedLocales: string[];
  /**
   * 新規公開（下書き→公開、または新規作成で公開指定）が翻訳失敗のため下書きに変わった場合に真。
   * 公開維持・翻訳なし公開で失敗localeがある場合は偽（`failedLocales`のみ返す）。
   */
  forcedDraft: boolean;
}

/** 個人指定の配信対象に有効なアカウントが1件も無く、保存しなかったことを表す結果。 */
export interface AnnouncementSaveRejected {
  error: "targetUsersUnavailable";
}

/**
 * 翻訳APIを呼ぶ前に配信対象を検証する。個人指定で有効なアカウントが残らない場合は
 * 拒否結果を返し、翻訳コストをかけずに保存を中止する。
 */
async function rejectUnavailableTargetUsers(
  targeting: AnnouncementActionInput["targeting"]
): Promise<AnnouncementSaveRejected | null> {
  try {
    await normalizeTargeting(targeting);
    return null;
  } catch (error) {
    if (error instanceof AnnouncementTargetUsersNotFoundError) {
      return { error: "targetUsersUnavailable" };
    }
    throw error;
  }
}

/**
 * ja本文から全対応言語の翻訳を組み立てる。翻訳に1言語でも失敗したとき、強制的に下書きにするのは
 * 「新規公開」（更新前が公開でない状態から公開指定）のときだけ。更新前が既に公開中の場合は
 * 公開を維持する（誤字修正で下書きに戻して再通知させない）。`publishWithoutTranslation`が真の
 * 場合も下書きにせず公開で保存する。失敗localeの翻訳行は保存されない（表示側はjaにフォールバック）。
 */
async function withAutoTranslations(
  parsed: ReturnType<typeof announcementFormSchema.parse>,
  existingId?: string
): Promise<{ input: CreateAnnouncementInput; failedLocales: string[]; forcedDraft: boolean }> {
  const { publishWithoutTranslation, ...values } = parsed;
  const existing = existingId ? await findAnnouncementById(existingId) : null;
  const { translations, failedLocales } = await buildAnnouncementTranslations(
    { title: values.title, body: values.body },
    existing?.translations ?? []
  );
  const isNewPublish = values.status === "published" && existing?.status !== "published";
  const forcedDraft = failedLocales.length > 0 && isNewPublish && !publishWithoutTranslation;

  return {
    input: { ...values, status: forcedDraft ? "draft" : values.status, translations },
    failedLocales,
    forcedDraft,
  };
}

/**
 * お知らせを新規作成し、ヘルプデスク側・申請者側・ダッシュボードのルートを再検証する。
 * 不正な入力（タイトル・本文・種別の未入力、配信対象の国0件選択）は保存せず例外を送出する。
 * 公開指定で翻訳に失敗した場合は、`publishWithoutTranslation`でない限り下書きとして保存する
 * （`failedLocales`・`forcedDraft`で通知）。
 */
export async function createAnnouncementAction(
  input: AnnouncementActionInput
): Promise<AnnouncementSaveResult | AnnouncementSaveRejected> {
  await requireHelpdeskStaffSession();
  const parsed = announcementFormSchema.parse(input);
  const rejected = await rejectUnavailableTargetUsers(parsed.targeting);
  if (rejected) return rejected;
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
): Promise<AnnouncementSaveResult | AnnouncementSaveRejected> {
  await requireHelpdeskStaffSession();
  const parsed = announcementFormSchema.parse(input);
  const rejected = await rejectUnavailableTargetUsers(parsed.targeting);
  if (rejected) return rejected;
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
