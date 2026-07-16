import { Announcement, CreateAnnouncementInput } from "@/types/announcement";
import {
  requireApplicantSession,
  requireHelpdeskStaffSession,
} from "@/lib/server/auth-session";
import {
  createAnnouncementRecord,
  deleteAnnouncementRecord,
  findAnnouncementById,
  findAnnouncementVisibleToCountry,
  listAllAnnouncements as listAllAnnouncementsService,
  listAnnouncementsVisibleToCountry,
  updateAnnouncementRecord,
} from "@/lib/server/announcement-service";

export interface GetRecentAnnouncementsOptions {
  limit?: number;
  /**
   * 表示するタイトル・本文の言語（`ja`/`en`）。省略時は既定言語（`ja`）として
   * サービス層が解決する（後方互換。`dashboard`spec側の既存呼び出しは省略可能）。
   */
  locale?: string;
}

/**
 * 自社（ログイン中の申請者セッションが所属する会社）に配信対象が及び、かつ公開期間内の
 * お知らせのうち、最新のものを返す。`options.locale`に対応するタイトル・本文
 * （要件16.5、未指定時は既定言語`ja`）で解決する。
 */
export async function getRecentAnnouncements(
  options?: GetRecentAnnouncementsOptions
): Promise<Announcement[]> {
  const limit = options?.limit ?? 3;
  const { claims } = await requireApplicantSession();
  const visible = options?.locale
    ? await listAnnouncementsVisibleToCountry(claims.country, options.locale)
    : await listAnnouncementsVisibleToCountry(claims.country);

  return visible.slice(0, limit);
}

/**
 * 自社（ログイン中の申請者セッションが所属する会社）に配信対象が及び、かつ公開期間内の
 * お知らせ全件を公開日の降順で返す。`options.locale`に対応するタイトル・本文
 * （要件16、未指定時は既定言語`ja`）で解決する。
 */
export async function getAnnouncements(
  options?: { locale?: string }
): Promise<Announcement[]> {
  const { claims } = await requireApplicantSession();

  return options?.locale
    ? listAnnouncementsVisibleToCountry(claims.country, options.locale)
    : listAnnouncementsVisibleToCountry(claims.country);
}

/**
 * 指定したIDのお知らせを1件返す。自社に配信対象が及ばない、公開期間外、または
 * 該当データが存在しない場合はnullを解決する。`options.locale`に対応するタイトル・本文
 * （要件16、未指定時は既定言語`ja`）で解決する。
 */
export async function getAnnouncementById(
  id: string,
  options?: { locale?: string }
): Promise<Announcement | null> {
  const { claims } = await requireApplicantSession();

  return options?.locale
    ? findAnnouncementVisibleToCountry(id, claims.country, options.locale)
    : findAnnouncementVisibleToCountry(id, claims.country);
}

/**
 * 絞り込みを行わず、全社向けのお知らせ全件を公開日の降順で返す。
 * ヘルプデスク側のお知らせ管理画面が利用する。
 */
export async function getAllAnnouncements(): Promise<Announcement[]> {
  await requireHelpdeskStaffSession();

  return listAllAnnouncementsService();
}

/**
 * 配信対象による絞り込みを行わず、指定したIDのお知らせを1件返す。
 * ヘルプデスク側の編集画面が利用する。該当データが存在しない場合はnullを解決する。
 */
export async function getAnnouncementByIdForHelpdesk(
  id: string
): Promise<Announcement | null> {
  await requireHelpdeskStaffSession();

  return findAnnouncementById(id);
}

/**
 * お知らせを新規作成する。公開状態が「公開」の場合、公開日時は保存操作を行った時刻とする。
 * 「下書き」の場合、公開日時は未設定のまま保存する。
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<Announcement> {
  await requireHelpdeskStaffSession();

  return createAnnouncementRecord(input);
}

/**
 * 既存お知らせの内容を更新する。
 */
export async function updateAnnouncement(
  id: string,
  input: CreateAnnouncementInput
): Promise<Announcement> {
  await requireHelpdeskStaffSession();

  return updateAnnouncementRecord(id, input);
}

/**
 * お知らせを削除する。
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  await requireHelpdeskStaffSession();

  return deleteAnnouncementRecord(id);
}
