import "server-only";

import { notFound } from "next/navigation";

import { isHelpdeskAdmin } from "@/lib/server/auth-session";

/**
 * 書き込み系ページ（新規作成・編集・CSV取込等）の先頭で呼ぶ。ヘルプデスクの
 * adminでなければ404にする（memberには編集画面の存在自体を見せない）。
 */
export async function requireHelpdeskAdminPage(): Promise<void> {
  if (!(await isHelpdeskAdmin())) {
    notFound();
  }
}
