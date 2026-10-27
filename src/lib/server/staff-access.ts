import "server-only";

import { prisma } from "@/lib/db/prisma";
import { requestCache } from "@/lib/server/request-cache";

/**
 * ヘルプデスクスタッフの有効状態とロールをDBで確認する（同一リクエスト内の重複照会は
 * まとめる）。行が存在しなければnull。`get-session`と`auth-session`の循環importを
 * 避けるため独立したファイルに置く。
 */
export const getStaffAccess = requestCache(
  async (staffId: string): Promise<{ isActive: boolean; role: "admin" | "member" } | null> =>
    prisma.helpdeskStaff.findUnique({
      where: { id: staffId },
      select: { isActive: true, role: true },
    })
);
