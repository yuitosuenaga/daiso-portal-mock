import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import {
  createLinkCategoryRecord,
  deleteLinkCategoryRecord,
  findLinkCategoryForHelpdesk,
  getLinkCategoriesForApplicant as getLinkCategoriesForApplicantRecord,
  listLinkCategoriesForHelpdesk,
  moveLinkCategoryRecord,
  updateLinkCategoryRecord,
} from "@/lib/server/link-category-service";
import type {
  CreateLinkCategoryInput,
  LinkCategory,
  LinkCategoryAdminView,
  LinkCategoryMoveDirection,
  LinkCategorySummary,
  UpdateLinkCategoryInput,
} from "@/types/link-category";

/**
 * 大分類・中分類の全件（`links-page`spec・プレビュー機能が利用する）を、名前を`locale`で
 * 解決した状態で返す。`LinkCategory`は公開範囲を持たないため、認証チェックは行わない
 * （既存の`getLinks()`と同一方針）。
 */
export async function getLinkCategoriesForApplicant(
  locale: string
): Promise<LinkCategorySummary[]> {
  return getLinkCategoriesForApplicantRecord(locale);
}

/** ヘルプデスク側: カテゴリ全件（階層・件数付き）を返す。 */
export async function getAllLinkCategories(): Promise<LinkCategoryAdminView[]> {
  await requireHelpdeskStaffSession();

  return listLinkCategoriesForHelpdesk();
}

/** ヘルプデスク側: 指定したIDのカテゴリを1件返す。 */
export async function getLinkCategoryById(id: string): Promise<LinkCategory | null> {
  await requireHelpdeskStaffSession();

  return findLinkCategoryForHelpdesk(id);
}

/** ヘルプデスク側: カテゴリを新規作成する。 */
export async function createLinkCategory(
  input: CreateLinkCategoryInput
): Promise<LinkCategory> {
  await requireHelpdeskStaffSession();

  return createLinkCategoryRecord(input);
}

/** ヘルプデスク側: 既存カテゴリの内容を更新する。 */
export async function updateLinkCategory(
  id: string,
  input: UpdateLinkCategoryInput
): Promise<LinkCategory> {
  await requireHelpdeskStaffSession();

  return updateLinkCategoryRecord(id, input);
}

/** ヘルプデスク側: カテゴリを削除する。使用中の場合は例外を送出する。 */
export async function deleteLinkCategory(id: string): Promise<void> {
  await requireHelpdeskStaffSession();

  return deleteLinkCategoryRecord(id);
}

/** ヘルプデスク側: カテゴリの表示順を並び替える。 */
export async function moveLinkCategory(
  id: string,
  direction: LinkCategoryMoveDirection
): Promise<void> {
  await requireHelpdeskStaffSession();

  return moveLinkCategoryRecord(id, direction);
}
