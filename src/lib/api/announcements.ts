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
}

/**
 * 自社（ログイン中の申請者セッションが所属する会社）に配信対象が及ぶお知らせのうち、
 * 最新のものを返す。
 */
export async function getRecentAnnouncements(
  options?: GetRecentAnnouncementsOptions
): Promise<Announcement[]> {
  const limit = options?.limit ?? 3;
  const { claims } = await requireApplicantSession();
  const visible = await listAnnouncementsVisibleToCountry(claims.country);

  return visible.slice(0, limit);
}

/**
 * 自社（ログイン中の申請者セッションが所属する会社）に配信対象が及ぶお知らせ全件を
 * 公開日の降順で返す。
 */
export async function getAnnouncements(): Promise<Announcement[]> {
  const { claims } = await requireApplicantSession();

  return listAnnouncementsVisibleToCountry(claims.country);
}

/**
 * 指定したIDのお知らせを1件返す。自社に配信対象が及ばない、または該当データが
 * 存在しない場合はnullを解決する。
 */
export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const { claims } = await requireApplicantSession();

  return findAnnouncementVisibleToCountry(id, claims.country);
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
 * お知らせを新規作成する。公開日時は保存操作を行った時刻とする。
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
