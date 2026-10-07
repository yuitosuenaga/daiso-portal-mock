import "server-only";

import { prisma } from "@/lib/db/prisma";
import { requireHelpdeskStaffSession } from "@/lib/server/auth-session";
import { ANNOUNCEMENT_TARGET_COMPANY_MAX_COUNT } from "@/lib/validation/announcement";
import type { CompanyTargetOption } from "@/types/applicant-user";

/** 会社指定の検索候補の最大件数。 */
export const COMPANY_SEARCH_LIMIT = 10;

/** 会社指定の検索語の最大文字数（それ以上は切り捨てる）。 */
const COMPANY_SEARCH_QUERY_MAX_LENGTH = 100;

const COMPANY_TARGET_OPTION_SELECT = {
  id: true,
  name: true,
  country: true,
  companyCode: true,
  _count: { select: { applicantUsers: { where: { isActive: true } } } },
} as const;

function mapCompanyTargetOption(record: {
  id: string;
  name: string;
  country: string;
  companyCode: string;
  _count: { applicantUsers: number };
}): CompanyTargetOption {
  return {
    id: record.id,
    name: record.name,
    country: record.country,
    companyCode: record.companyCode,
    activeUserCount: record._count.applicantUsers,
  };
}

/**
 * お知らせの会社指定用に、会社を会社名・会社コードの部分一致（大文字小文字を区別しない）で
 * 検索する。空のクエリは空配列を返す。
 */
export async function searchCompaniesForTargeting(query: string): Promise<CompanyTargetOption[]> {
  await requireHelpdeskStaffSession();

  if (typeof query !== "string") {
    return [];
  }
  const trimmed = query.trim().slice(0, COMPANY_SEARCH_QUERY_MAX_LENGTH);
  if (trimmed === "") {
    return [];
  }

  const contains = { contains: trimmed, mode: "insensitive" as const };
  const records = await prisma.company.findMany({
    where: { OR: [{ name: contains }, { companyCode: contains }] },
    select: COMPANY_TARGET_OPTION_SELECT,
    orderBy: { name: "asc" },
    take: COMPANY_SEARCH_LIMIT,
  });

  return records.map(mapCompanyTargetOption);
}

/** 指定IDの会社を表示用情報で取得する（編集画面での選択済み対象の復元用）。 */
export async function listCompaniesForTargetingByIds(
  ids: string[]
): Promise<CompanyTargetOption[]> {
  await requireHelpdeskStaffSession();

  if (ids.length === 0) {
    return [];
  }

  const records = await prisma.company.findMany({
    where: { id: { in: ids.slice(0, ANNOUNCEMENT_TARGET_COMPANY_MAX_COUNT) } },
    select: COMPANY_TARGET_OPTION_SELECT,
    orderBy: { name: "asc" },
  });

  return records.map(mapCompanyTargetOption);
}
