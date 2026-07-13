import { Link } from "@/types/link";
import { listLinks } from "@/lib/server/link-service";

/**
 * リンク全件を返す。並び順の保証はなく、カテゴリ別グループ化は呼び出し側の責務とする。
 * 会社・ロールによるスコープ制御は行わない（申請者側・ヘルプデスク側で同一の結果を返す）。
 */
export async function getLinks(): Promise<Link[]> {
  return listLinks();
}
