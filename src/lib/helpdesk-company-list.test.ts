import { describe, expect, it } from "vitest";

import { filterCompaniesForManagement } from "@/lib/helpdesk-company-list";
import type { CompanyWithStats } from "@/types/company";

function company(overrides: Partial<CompanyWithStats> = {}): CompanyWithStats {
  return {
    id: "company-1",
    name: "Daiso Thailand",
    country: "TH",
    companyCode: "TH-001",
    createdAt: "2026-07-01T00:00:00.000Z",
    applicantUserCount: 2,
    ...overrides,
  };
}

describe("filterCompaniesForManagement", () => {
  const companies = [
    company({ id: "1", name: "Daiso Thailand", companyCode: "TH-001" }),
    company({ id: "2", name: "Daiso Vietnam", companyCode: "VN-002" }),
  ];

  it("キーワードが空文字列のときは絞り込みを行わない", () => {
    const result = filterCompaniesForManagement(companies, "");

    expect(result).toEqual(companies);
  });

  it("キーワードが空白文字のみのときは絞り込みを行わない", () => {
    const result = filterCompaniesForManagement(companies, "   ");

    expect(result).toEqual(companies);
  });

  it("会社名の部分一致（大文字小文字を区別しない）で絞り込む", () => {
    const result = filterCompaniesForManagement(companies, "vietnam");

    expect(result.map((c) => c.id)).toEqual(["2"]);
  });

  it("販社コードの部分一致（大文字小文字を区別しない）で絞り込む", () => {
    const result = filterCompaniesForManagement(companies, "th-001");

    expect(result.map((c) => c.id)).toEqual(["1"]);
  });

  it("一致する会社が無いときは空配列を返す", () => {
    const result = filterCompaniesForManagement(companies, "no-match");

    expect(result).toEqual([]);
  });
});
