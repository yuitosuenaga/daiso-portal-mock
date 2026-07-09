import { Faq } from "@/types/faq";
import { listFaqs } from "@/lib/server/faq-service";

/**
 * FAQ全件を返す。並び順の保証はなく、カテゴリ別グループ化は呼び出し側の責務とする。
 * 会社・ロールによるスコープ制御は行わない（申請者側・ヘルプデスク側で同一の結果を返す）。
 */
export async function getFaqs(): Promise<Faq[]> {
  return listFaqs();
}
