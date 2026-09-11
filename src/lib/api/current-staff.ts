import "server-only";

import { getSession } from "@/lib/server/get-session";

/**
 * ログイン中のヘルプデスク担当者の表示名を返す。ヘルプデスクセッションでない場合はnull。
 * ダッシュボード/一覧の「自分の担当」KPI判定に使う。`vi.mock`で1行差し替えられるよう、
 * `requireHelpdeskStaffSession`を直接呼ぶのではなく薄いAPI層として分離する。
 */
export async function getCurrentHelpdeskStaffName(): Promise<string | null> {
  const session = await getSession();

  if (session?.claims?.role !== "helpdesk") {
    return null;
  }

  return session.claims.displayName;
}
