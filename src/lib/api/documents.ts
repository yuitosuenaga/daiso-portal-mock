import { Document, CreateDocumentInput } from "@/types/document";
import {
  requireApplicantSession,
  requireHelpdeskStaffSession,
} from "@/lib/server/auth-session";
import {
  createDocumentRecord,
  deleteDocumentRecord,
  findDocumentById,
  findDocumentVisibleTo,
  listAllDocuments as listAllDocumentsService,
  listDocumentsVisibleTo,
  updateDocumentRecord,
} from "@/lib/server/document-service";

/**
 * 自社（ログイン中の申請者セッションが所属する会社）に公開範囲が及ぶドキュメント全件を
 * アップロード日の降順で返す。
 */
export async function getDocuments(): Promise<Document[]> {
  const { claims } = await requireApplicantSession();

  return listDocumentsVisibleTo(claims.country, claims.companyCode);
}

/**
 * 指定したIDのドキュメントを1件返す。自社に公開範囲が及ばない、または該当データが
 * 存在しない場合はnullを解決する。
 */
export async function getDocumentById(id: string): Promise<Document | null> {
  const { claims } = await requireApplicantSession();

  return findDocumentVisibleTo(id, claims.country, claims.companyCode);
}

/**
 * 公開範囲による絞り込みを行わず、ドキュメント全件をアップロード日の降順で返す。
 * ヘルプデスク側のドキュメント管理画面が利用する。
 */
export async function getAllDocuments(): Promise<Document[]> {
  await requireHelpdeskStaffSession();

  return listAllDocumentsService();
}

/**
 * 公開範囲による絞り込みを行わず、指定したIDのドキュメントを1件返す。
 * ヘルプデスク側の編集画面が利用する。該当データが存在しない場合はnullを解決する。
 */
export async function getDocumentByIdForHelpdesk(
  id: string
): Promise<Document | null> {
  await requireHelpdeskStaffSession();

  return findDocumentById(id);
}

/**
 * ドキュメントを新規作成する。アップロード日時は保存操作を行った時刻とする。
 */
export async function createDocument(
  input: CreateDocumentInput
): Promise<Document> {
  await requireHelpdeskStaffSession();

  return createDocumentRecord(input);
}

/**
 * 既存ドキュメントの内容を更新する。
 */
export async function updateDocument(
  id: string,
  input: CreateDocumentInput
): Promise<Document> {
  await requireHelpdeskStaffSession();

  return updateDocumentRecord(id, input);
}

/**
 * ドキュメントを削除する。
 */
export async function deleteDocument(id: string): Promise<void> {
  await requireHelpdeskStaffSession();

  return deleteDocumentRecord(id);
}
