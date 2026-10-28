import "server-only";

import { prisma } from "@/lib/db/prisma";
import { requestCache } from "@/lib/server/request-cache";

export type ApplicantAccess = {
  isActive: boolean;
  companyId: string;
  company: { name: string; companyCode: string; country: string };
};

/**
 * 申請者アカウントの有効状態と所属会社の現在値をDBで確認する（同一リクエスト内の重複照会は
 * まとめる）。行が存在しなければnull。JWTの会社情報はログイン時の値で古くなりうるため、
 * 会社情報の正はここで取得するDB値とする。`staff-access.ts`と同じ理由で独立したファイルに置く。
 */
export const getApplicantAccess = requestCache(
  async (applicantUserId: string): Promise<ApplicantAccess | null> =>
    prisma.applicantUser.findUnique({
      where: { id: applicantUserId },
      select: {
        isActive: true,
        companyId: true,
        company: { select: { name: true, companyCode: true, country: true } },
      },
    })
);
