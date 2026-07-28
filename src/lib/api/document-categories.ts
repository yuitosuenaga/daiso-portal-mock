import {
  requireApplicantSession,
  requireHelpdeskStaffSession,
} from "@/lib/server/auth-session";
import {
  createDocumentCategoryRecord,
  deleteDocumentCategoryRecord,
  findDocumentCategoryForHelpdesk,
  findVisibleDocumentCategory,
  listDocumentCategoriesForHelpdesk,
  listVisibleDocumentCategories,
  moveDocumentCategoryRecord,
  updateDocumentCategoryRecord,
} from "@/lib/server/document-category-service";
import type {
  CreateDocumentCategoryInput,
  DocumentCategory,
  DocumentCategoryAdminView,
  DocumentCategoryDetail,
  DocumentCategoryMoveDirection,
  DocumentCategorySummary,
  UpdateDocumentCategoryInput,
} from "@/types/document-category";

/**
 * 自社（ログイン中の申請者セッションが所属する会社）に可視な大分類一覧を返す
 * （`documents`spec側のトップページが利用する）。
 */
export async function getVisibleDocumentCategories(
  options?: { locale?: string }
): Promise<DocumentCategorySummary[]> {
  const { claims } = await requireApplicantSession();

  return listVisibleDocumentCategories(
    claims.country,
    claims.companyCode,
    options?.locale
  );
}

/**
 * 指定したIDの大分類（自社に可視なもの）を1件返す。非可視・中分類ID・存在しないIDは
 * `null`を返す。
 */
export async function getVisibleDocumentCategory(
  id: string,
  options?: { locale?: string }
): Promise<DocumentCategoryDetail | null> {
  const { claims } = await requireApplicantSession();

  return findVisibleDocumentCategory(
    id,
    claims.country,
    claims.companyCode,
    options?.locale
  );
}

/** ヘルプデスク側: カテゴリ全件（階層・件数付き）を返す。 */
export async function getAllDocumentCategories(): Promise<
  DocumentCategoryAdminView[]
> {
  await requireHelpdeskStaffSession();

  return listDocumentCategoriesForHelpdesk();
}

/** ヘルプデスク側: 指定したIDのカテゴリを1件返す。 */
export async function getDocumentCategoryById(
  id: string
): Promise<DocumentCategory | null> {
  await requireHelpdeskStaffSession();

  return findDocumentCategoryForHelpdesk(id);
}

/** ヘルプデスク側: カテゴリを新規作成する。 */
export async function createDocumentCategory(
  input: CreateDocumentCategoryInput
): Promise<DocumentCategory> {
  await requireHelpdeskStaffSession();

  return createDocumentCategoryRecord(input);
}

/** ヘルプデスク側: 既存カテゴリの内容を更新する。 */
export async function updateDocumentCategory(
  id: string,
  input: UpdateDocumentCategoryInput
): Promise<DocumentCategory> {
  await requireHelpdeskStaffSession();

  return updateDocumentCategoryRecord(id, input);
}

/** ヘルプデスク側: カテゴリを削除する。使用中の場合は例外を送出する。 */
export async function deleteDocumentCategory(id: string): Promise<void> {
  await requireHelpdeskStaffSession();

  return deleteDocumentCategoryRecord(id);
}

/** ヘルプデスク側: カテゴリの表示順を並び替える。 */
export async function moveDocumentCategory(
  id: string,
  direction: DocumentCategoryMoveDirection
): Promise<void> {
  await requireHelpdeskStaffSession();

  return moveDocumentCategoryRecord(id, direction);
}
