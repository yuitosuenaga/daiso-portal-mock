import { CreateLinkInput, Link } from "@/types/link";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import {
  createLinkRecord,
  deleteLinkRecord,
  findLinkById,
  listLinks,
  listLinksForHelpdesk as listLinksForHelpdeskService,
  updateLinkRecord,
  type LinkWithTimestamp,
} from "@/lib/server/link-service";

/**
 * リンク全件を返す。並び順の保証はなく、カテゴリ別グループ化は呼び出し側の責務とする。
 * 会社・ロールによるスコープ制御は行わない（申請者側・ヘルプデスク側で同一の結果を返す）。
 */
export async function getLinks(): Promise<Link[]> {
  return listLinks();
}

/** ヘルプデスク管理一覧向けに、登録日降順で全件を返す。ヘルプデスクセッションを要求する。 */
export async function getLinksForHelpdesk(): Promise<LinkWithTimestamp[]> {
  await requireHelpdeskStaffSession();

  return listLinksForHelpdeskService();
}

/**
 * 指定されたIDのリンクを1件取得する。ヘルプデスクセッションを要求する。
 * 該当データが存在しない場合は例外をthrowせず`null`を解決する。
 */
export async function getLinkByIdForHelpdesk(id: string): Promise<Link | null> {
  await requireHelpdeskStaffSession();

  return findLinkById(id);
}

/** リンクを新規作成する。ヘルプデスクセッションを要求する。 */
export async function createLink(input: CreateLinkInput): Promise<Link> {
  await requireHelpdeskStaffSession();

  return createLinkRecord(input);
}

/** 既存リンクの内容を更新する。ヘルプデスクセッションを要求する。 */
export async function updateLink(
  id: string,
  input: CreateLinkInput
): Promise<Link> {
  await requireHelpdeskStaffSession();

  return updateLinkRecord(id, input);
}

/** リンクを削除する。ヘルプデスクセッションを要求する。 */
export async function deleteLink(id: string): Promise<void> {
  await requireHelpdeskStaffSession();

  return deleteLinkRecord(id);
}
