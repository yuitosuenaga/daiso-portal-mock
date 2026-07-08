"use server";

import { revalidatePath } from "next/cache";

import {
  createDocument,
  deleteDocument,
  updateDocument,
} from "@/lib/api/documents";
import { documentFormSchema } from "@/lib/validation/document";
import type { CreateDocumentInput, Document } from "@/types/document";

const HELPDESK_DOCUMENT_LIST_PATH = "/[locale]/helpdesk/documents";
const HELPDESK_DOCUMENT_EDIT_PATH = "/[locale]/helpdesk/documents/[id]/edit";
const APPLICANT_DOCUMENT_LIST_PATH = "/[locale]/documents";
const APPLICANT_DOCUMENT_DETAIL_PATH = "/[locale]/documents/[id]";

function revalidateDocumentRoutes() {
  revalidatePath(HELPDESK_DOCUMENT_LIST_PATH, "page");
  revalidatePath(HELPDESK_DOCUMENT_EDIT_PATH, "page");
  revalidatePath(APPLICANT_DOCUMENT_LIST_PATH, "page");
  revalidatePath(APPLICANT_DOCUMENT_DETAIL_PATH, "page");
}

/**
 * ドキュメントを新規作成し、ヘルプデスク側・申請者側のルートを再検証する。
 * 不正な入力（タイトル未入力、ファイル形式・サイズ不正、公開範囲0件選択など）は
 * 保存せず例外を送出する。
 */
export async function createDocumentAction(
  input: CreateDocumentInput
): Promise<Document> {
  const parsed = documentFormSchema.parse(input);
  const created = await createDocument(parsed);
  revalidateDocumentRoutes();

  return created;
}

/**
 * 既存ドキュメントの内容を更新し、ヘルプデスク側・申請者側のルートを再検証する。
 * 不正な入力は保存せず例外を送出する。
 */
export async function updateDocumentAction(
  id: string,
  input: CreateDocumentInput
): Promise<Document> {
  const parsed = documentFormSchema.parse(input);
  const updated = await updateDocument(id, parsed);
  revalidateDocumentRoutes();

  return updated;
}

/**
 * ドキュメントを削除し、ヘルプデスク側・申請者側のルートを再検証する。
 */
export async function deleteDocumentAction(id: string): Promise<void> {
  await deleteDocument(id);
  revalidateDocumentRoutes();
}
