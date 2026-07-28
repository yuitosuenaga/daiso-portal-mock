"use server";

import { revalidatePath } from "next/cache";

import {
  createDocumentCategory,
  deleteDocumentCategory,
  moveDocumentCategory,
  updateDocumentCategory,
} from "@/lib/api/document-categories";
import { documentCategoryFormSchema } from "@/lib/validation/document-category";
import type {
  CreateDocumentCategoryInput,
  DocumentCategory,
  DocumentCategoryMoveDirection,
  UpdateDocumentCategoryInput,
} from "@/types/document-category";

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
 * サーバー側再検証を行う（要件20.11・21.12）。名称重複・階層違反等、スキーマで
 * 表現できない検証はサービス層の例外をそのまま送出する。
 */
export async function createDocumentCategoryAction(
  input: CreateDocumentCategoryInput
): Promise<DocumentCategory> {
  const parsed = documentCategoryFormSchema.parse(input);
  const created = await createDocumentCategory(parsed);
  revalidateDocumentCategoryRoutes();

  return created;
}

/**
 * カテゴリを更新し、関連ルートを再検証する。
 */
export async function updateDocumentCategoryAction(
  id: string,
  input: UpdateDocumentCategoryInput
): Promise<DocumentCategory> {
  const parsed = documentCategoryFormSchema.parse({ parentId: null, ...input });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { parentId, ...updateInput } = parsed;
  const updated = await updateDocumentCategory(id, updateInput);
  revalidateDocumentCategoryRoutes();

  return updated;
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
