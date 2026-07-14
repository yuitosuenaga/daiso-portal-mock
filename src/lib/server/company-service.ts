import "server-only";

import { prisma } from "@/lib/db/prisma";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";

/** ヘルプデスク代理登録画面の対象会社選択欄に表示する会社情報。 */
export interface CompanyOption {
  id: string;
  name: string;
  country: string;
}

/**
 * 全社の会社名・国を`name`昇順で返す。ヘルプデスク側の代理問い合わせ登録画面
 * （`/helpdesk/inquiry/new`）専用の読み取り関数であり、問い合わせ内容等の
 * 機密情報は含まない（`helpdesk-inquiry-management`spec 要件15）。
 *
 * 現状は呼び出し元ページが`/helpdesk/*`配下のミドルウェアで保護されているが、
 * `lib/api/faqs.ts`・`lib/api/links.ts`等の既存パターンに合わせて、本関数自体にも
 * ヘルプデスクセッションの検証を持たせる（多層防御）。将来ミドルウェア対象外の
 * 経路（Route Handler等）から誤って呼び出された場合に全社情報が無検証で
 * 漏出することを防ぐ。
 */
export async function listCompaniesForHelpdesk(): Promise<CompanyOption[]> {
  await requireHelpdeskStaffSession();

  const records = await prisma.company.findMany({
    orderBy: { name: "asc" },
  });

  return records.map((record) => ({
    id: record.id,
    name: record.name,
    country: record.country,
  }));
}
