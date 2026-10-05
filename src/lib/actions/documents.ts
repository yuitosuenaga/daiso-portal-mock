"use server";

import { revalidatePath } from "next/cache";

import {
  createDocument,
  deleteDocument,
  getDocumentByIdForHelpdesk,
  updateDocument,
} from "@/lib/api/documents";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import {
  findMissingLocales,
  planDocumentTranslations,
  translateDocumentTexts,
} from "@/lib/server/document-auto-translation";
import {
  DocumentNotFoundError,
  findDocumentById,
  upsertDocumentTranslations,
} from "@/lib/server/document-service";
import { documentFormSchema } from "@/lib/validation/document";
import { toGoogleEmbedUrl } from "@/lib/google-document-url";
import { assertDocumentCategoryPair } from "@/lib/server/document-category-service";
import type {
  CreateDocumentInput,
  DocumentFormInput,
  DocumentSaveResult,
  RetranslateResult,
} from "@/types/document";

const HELPDESK_DOCUMENT_LIST_PATH = "/[locale]/helpdesk/documents";
const HELPDESK_DOCUMENT_NEW_PATH = "/[locale]/helpdesk/documents/new";
const HELPDESK_DOCUMENT_EDIT_PATH = "/[locale]/helpdesk/documents/[id]/edit";
const APPLICANT_DOCUMENT_LIST_PATH = "/[locale]/documents";
const APPLICANT_DOCUMENT_CATEGORY_PATH = "/[locale]/documents/categories/[categoryId]";

function revalidateDocumentRoutes() {
  revalidatePath(HELPDESK_DOCUMENT_LIST_PATH, "page");
  revalidatePath(HELPDESK_DOCUMENT_NEW_PATH, "page");
  revalidatePath(HELPDESK_DOCUMENT_EDIT_PATH, "page");
  revalidatePath(APPLICANT_DOCUMENT_LIST_PATH, "page");
  // 2026-07-28: 申請者側詳細パス（`/[locale]/documents/[id]`）は2026-07-09の画面変更で
  // 既に撤廃済みのため、大分類配下のドキュメント一覧（`documents`spec要件20・21）の
  // 再検証へ置き換える（要件18.14）。
  revalidatePath(APPLICANT_DOCUMENT_CATEGORY_PATH, "page");
}

/**
 * `sourceType: "google"`の場合、`googleEmbedUrl`をクライアントから送られた値のまま
 * 信頼せず、`googleUrl`からサーバー側で再計算する。クライアントが任意の埋め込みURLを
 * 注入する経路を防ぐための措置。
 */
function withServerRecomputedEmbedUrl<T extends DocumentFormInput>(input: T): T {
  if (input.sourceType !== "google") return input;

  const googleEmbedUrl = toGoogleEmbedUrl(input.googleUrl);
  if (!googleEmbedUrl) {
    throw new Error("Invalid Google document URL");
  }

  return { ...input, googleEmbedUrl };
}

/**
 * ドキュメントを新規作成し、ヘルプデスク側・申請者側のルートを再検証する。
 * 日本語のタイトル・説明を全対応言語へ自動翻訳して保存する。翻訳に失敗しても保存は続行し、
 * 翻訳できなかった言語を`failedLocales`で返す（後から`retranslateDocumentAction`で再実行できる）。
 * 不正な入力（タイトル未入力、ファイル形式・サイズ不正、公開範囲0件選択など）は
 * 保存せず例外を送出する。
 */
export async function createDocumentAction(
  input: DocumentFormInput
): Promise<DocumentSaveResult> {
  await requireHelpdeskStaffSession();
  const parsed = documentFormSchema.parse(input);
  // 大分類・中分類の親子整合（要件18.9・18.10）はzodでは検証できないため、
  // スキーマ検証後にサービス層で検証してから保存する。
  await assertDocumentCategoryPair(parsed.categoryId, parsed.subCategoryId);
  const { translations, failedLocales } = await planDocumentTranslations(parsed, null);
  const created = await createDocument({
    ...withServerRecomputedEmbedUrl(parsed),
    translations,
  } as CreateDocumentInput);
  revalidateDocumentRoutes();

  return { document: created, failedLocales };
}

/**
 * 既存ドキュメントの内容を更新し、ヘルプデスク側・申請者側のルートを再検証する。
 * 日本語の原文（タイトル・説明）が変わった場合のみ再翻訳し、変わらなければ既存翻訳を維持する。
 * 不正な入力は保存せず例外を送出する。
 */
export async function updateDocumentAction(
  id: string,
  input: DocumentFormInput
): Promise<DocumentSaveResult> {
  await requireHelpdeskStaffSession();
  const parsed = documentFormSchema.parse(input);
  await assertDocumentCategoryPair(parsed.categoryId, parsed.subCategoryId);
  const existing = await getDocumentByIdForHelpdesk(id);
  if (!existing) {
    throw new DocumentNotFoundError(id);
  }
  const { translations, failedLocales } = await planDocumentTranslations(parsed, existing);
  const updated = await updateDocument(id, {
    ...withServerRecomputedEmbedUrl(parsed),
    translations,
  } as CreateDocumentInput);
  revalidateDocumentRoutes();

  return { document: updated, failedLocales };
}

/**
 * 翻訳APIのみを再実行する。日本語の原文に対して不足している言語だけを翻訳して保存し、
 * 依然として翻訳できなかった言語を`failedLocales`で返す（全言語が揃っていればAPIを呼ばない）。
 */
export async function retranslateDocumentAction(id: string): Promise<RetranslateResult> {
  await requireHelpdeskStaffSession();
  const existing = await findDocumentById(id);
  if (!existing) {
    throw new DocumentNotFoundError(id);
  }

  const missing = findMissingLocales(existing.translations.map((t) => t.locale));
  if (missing.length === 0) {
    return { failedLocales: [] };
  }

  const { translations, failedLocales } = await translateDocumentTexts(existing, missing);
  if (translations.length > 0) {
    await upsertDocumentTranslations(id, translations);
    revalidateDocumentRoutes();
  }

  return { failedLocales };
}

/**
 * ドキュメントを削除し、ヘルプデスク側・申請者側のルートを再検証する。
 */
export async function deleteDocumentAction(id: string): Promise<void> {
  await deleteDocument(id);
  revalidateDocumentRoutes();
}
