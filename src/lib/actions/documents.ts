"use server";

import { revalidatePath } from "next/cache";

import {
  createDocument,
  deleteDocument,
  updateDocument,
} from "@/lib/api/documents";
import { documentFormSchema } from "@/lib/validation/document";
import { toGoogleEmbedUrl } from "@/lib/google-document-url";
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
 * `sourceType: "google"`の場合、`googleEmbedUrl`をクライアントから送られた値のまま
 * 信頼せず、`googleUrl`からサーバー側で再計算する。クライアントが任意の埋め込みURLを
 * 注入する経路を防ぐための措置。
 */
function withServerRecomputedEmbedUrl(
  input: CreateDocumentInput
): CreateDocumentInput {
  if (input.sourceType !== "google") return input;

  const googleEmbedUrl = toGoogleEmbedUrl(input.googleUrl);
  if (!googleEmbedUrl) {
    throw new Error("Invalid Google document URL");
  }

  return { ...input, googleEmbedUrl };
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
  const created = await createDocument(withServerRecomputedEmbedUrl(parsed));
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
  const updated = await updateDocument(id, withServerRecomputedEmbedUrl(parsed));
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
