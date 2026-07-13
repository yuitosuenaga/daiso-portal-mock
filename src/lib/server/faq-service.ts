import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Faq } from "@/types/faq";

/**
 * FAQ全件を取得する。並び順の保証はなく、絞り込みも行わない
 * （申請者側・ヘルプデスク側で同一の結果を返す既存モックの振る舞いを維持する）。
 */
export async function listFaqs(): Promise<Faq[]> {
  const records = await prisma.faq.findMany();

  return records.map((record) => ({
    id: record.id,
    category: record.category,
    question: record.question,
    answer: record.answer,
  }));
}
