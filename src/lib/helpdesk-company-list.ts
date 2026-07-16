import type { CompanyWithStats } from "@/types/company";

/**
 * 会社名・販社コードのいずれかにキーワードが部分一致（大文字小文字を区別しない）する
 * 会社のみを返す。キーワードが空文字列（前後の空白のみを含む）のときは絞り込みを行わない。
 */
export function filterCompaniesForManagement(
  companies: CompanyWithStats[],
  keyword: string
): CompanyWithStats[] {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return companies;
  }

  return companies.filter(
    (company) =>
      company.name.toLowerCase().includes(normalizedKeyword) ||
      company.companyCode.toLowerCase().includes(normalizedKeyword)
  );
}
