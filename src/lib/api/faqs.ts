import { CreateFaqInput, Faq } from "@/types/faq";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import {
  createFaqRecord,
  deleteFaqRecord,
  findFaqById,
  listFaqs,
  listFaqsForHelpdesk as listFaqsForHelpdeskService,
  updateFaqRecord,
  type FaqWithTimestamp,
} from "@/lib/server/faq-service";

/**
 * FAQ全件を返す。並び順の保証はなく、カテゴリ別グループ化は呼び出し側の責務とする。
 * 会社・ロールによるスコープ制御は行わない（申請者側・ヘルプデスク側で同一の結果を返す）。
 */
export async function getFaqs(): Promise<Faq[]> {
  return listFaqs();
}

/** ヘルプデスク管理一覧向けに、登録日降順で全件を返す。ヘルプデスクセッションを要求する。 */
export async function getFaqsForHelpdesk(): Promise<FaqWithTimestamp[]> {
  await requireHelpdeskStaffSession();

  return listFaqsForHelpdeskService();
}

/**
 * 指定されたIDのFAQを1件取得する。ヘルプデスクセッションを要求する。
 * 該当データが存在しない場合は例外をthrowせず`null`を解決する。
 */
export async function getFaqByIdForHelpdesk(id: string): Promise<Faq | null> {
  await requireHelpdeskStaffSession();

  return findFaqById(id);
}

/** FAQを新規作成する。ヘルプデスクセッションを要求する。 */
export async function createFaq(input: CreateFaqInput): Promise<Faq> {
  await requireHelpdeskStaffSession();

  return createFaqRecord(input);
}

/** 既存FAQの内容を更新する。ヘルプデスクセッションを要求する。 */
export async function updateFaq(
  id: string,
  input: CreateFaqInput
): Promise<Faq> {
  await requireHelpdeskStaffSession();

  return updateFaqRecord(id, input);
}

/** FAQを削除する。ヘルプデスクセッションを要求する。 */
export async function deleteFaq(id: string): Promise<void> {
  await requireHelpdeskStaffSession();

  return deleteFaqRecord(id);
}
