import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Link } from "@/types/link";

/**
 * リンク全件を取得する。並び順の保証はなく、絞り込みも行わない
 * （申請者側・ヘルプデスク側で同一の結果を返す既存モックの振る舞いを維持する）。
 */
export async function listLinks(): Promise<Link[]> {
  const records = await prisma.link.findMany();

  return records.map((record) => ({
    id: record.id,
    title: record.title,
    url: record.url,
    category: record.category,
    description: record.description ?? undefined,
  }));
}
