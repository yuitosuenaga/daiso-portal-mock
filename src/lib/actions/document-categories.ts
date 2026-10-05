"use server";

import { revalidatePath } from "next/cache";

import {
  createDocumentCategory,
  deleteDocumentCategory,
  getDocumentCategoryById,
  moveDocumentCategory,
  updateDocumentCategory,
} from "@/lib/api/document-categories";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import {
  findMissingLocales,
  planCategoryTranslations,
  translateCategoryNames,
} from "@/lib/server/document-auto-translation";
import {
  DocumentCategoryNotFoundError,
  findDocumentCategoryForHelpdesk,
  upsertDocumentCategoryTranslations,
} from "@/lib/server/document-category-service";
import { documentCategoryFormSchema } from "@/lib/validation/document-category";
import type {
  DocumentCategoryFormInput,
  DocumentCategoryMoveDirection,
  DocumentCategorySaveResult,
} from "@/types/document-category";
import type { RetranslateResult } from "@/types/document";

const HELPDESK_CATEGORY_LIST_PATH = "/[locale]/helpdesk/documents/categories";
const HELPDESK_DOCUMENT_LIST_PATH = "/[locale]/helpdesk/documents";
const HELPDESK_DOCUMENT_NEW_PATH = "/[locale]/helpdesk/documents/new";
const HELPDESK_DOCUMENT_EDIT_PATH = "/[locale]/helpdesk/documents/[id]/edit";
const APPLICANT_DOCUMENT_LIST_PATH = "/[locale]/documents";
const APPLICANT_DOCUMENT_CATEGORY_PATH = "/[locale]/documents/categories/[categoryId]";

/**
 * カテゴリの追加・編集・削除・並び替え完了時の再検証対象（要件19.13）。
 * カテゴリ管理画面・ドキュメント管理一覧・ドキュメントの作成/編集画面、および
 * 申請者側の大分類一覧トップページ・大分類配下のドキュメント一覧を含める。
 */
function revalidateDocumentCategoryRoutes() {
  revalidatePath(HELPDESK_CATEGORY_LIST_PATH, "page");
  revalidatePath(HELPDESK_DOCUMENT_LIST_PATH, "page");
  revalidatePath(HELPDESK_DOCUMENT_NEW_PATH, "page");
  revalidatePath(HELPDESK_DOCUMENT_EDIT_PATH, "page");
  revalidatePath(APPLICANT_DOCUMENT_LIST_PATH, "page");
  revalidatePath(APPLICANT_DOCUMENT_CATEGORY_PATH, "page");
}

/**
 * カテゴリを新規作成し、関連ルートを再検証する。`documentCategoryFormSchema`による
 * サーバー側再検証を行う（要件20.11・21.12）。日本語名称を全対応言語へ自動翻訳して保存し、
 * 翻訳に失敗しても保存は続行する（失敗した言語は`failedLocales`で返す）。名称重複・階層違反等、
 * スキーマで表現できない検証はサービス層の例外をそのまま送出する。
 */
export async function createDocumentCategoryAction(
  input: DocumentCategoryFormInput
): Promise<DocumentCategorySaveResult> {
  await requireHelpdeskStaffSession();
  const parsed = documentCategoryFormSchema.parse(input);
  const { translations, failedLocales } = await planCategoryTranslations(parsed.name, null);
  const created = await createDocumentCategory({ ...parsed, translations });
  revalidateDocumentCategoryRoutes();

  return { category: created, failedLocales };
}

/**
 * カテゴリを更新し、関連ルートを再検証する。日本語名称が変わった場合のみ再翻訳し、
 * 変わらなければ既存翻訳を維持する。
 */
export async function updateDocumentCategoryAction(
  id: string,
  input: Omit<DocumentCategoryFormInput, "parentId">
): Promise<DocumentCategorySaveResult> {
  await requireHelpdeskStaffSession();
  const parsed = documentCategoryFormSchema.parse({ parentId: null, ...input });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { parentId, ...updateInput } = parsed;
  const existing = await getDocumentCategoryById(id);
  if (!existing) {
    throw new DocumentCategoryNotFoundError(id);
  }
  const { translations, failedLocales } = await planCategoryTranslations(
    updateInput.name,
    existing
  );
  const updated = await updateDocumentCategory(id, { ...updateInput, translations });
  revalidateDocumentCategoryRoutes();

  return { category: updated, failedLocales };
}

/**
 * 翻訳APIのみを再実行する。日本語名称に対して不足している言語だけを翻訳して保存し、
 * 依然として翻訳できなかった言語を`failedLocales`で返す。
 */
export async function retranslateDocumentCategoryAction(
  id: string
): Promise<RetranslateResult> {
  await requireHelpdeskStaffSession();
  const existing = await findDocumentCategoryForHelpdesk(id);
  if (!existing) {
    throw new DocumentCategoryNotFoundError(id);
  }

  const missing = findMissingLocales(existing.translations.map((t) => t.locale));
  if (missing.length === 0) {
    return { failedLocales: [] };
  }

  const { translations, failedLocales } = await translateCategoryNames(existing.name, missing);
  if (translations.length > 0) {
    await upsertDocumentCategoryTranslations(id, translations);
    revalidateDocumentCategoryRoutes();
  }

  return { failedLocales };
}

/**
 * カテゴリを削除し、関連ルートを再検証する。使用中（紐づくドキュメント・配下の中分類が
 * 1件以上）の場合は`DocumentCategoryInUseError`を送出し、削除・再検証は行わない。
 */
export async function deleteDocumentCategoryAction(id: string): Promise<void> {
  await deleteDocumentCategory(id);
  revalidateDocumentCategoryRoutes();
}

/**
 * カテゴリの表示順を並び替え、関連ルートを再検証する。
 */
export async function moveDocumentCategoryAction(
  id: string,
  direction: DocumentCategoryMoveDirection
): Promise<void> {
  await moveDocumentCategory(id, direction);
  revalidateDocumentCategoryRoutes();
}
