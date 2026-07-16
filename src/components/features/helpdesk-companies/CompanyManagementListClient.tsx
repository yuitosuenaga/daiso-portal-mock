"use client";

import { useMemo, useState } from "react";

import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { filterCompaniesForManagement } from "@/lib/helpdesk-company-list";
import type { CompanyWithStats } from "@/types/company";

export interface CompanyManagementListClientProps {
  companies: CompanyWithStats[];
  countryLabels: Record<string, string>;
  locale: string;
  searchLabel: string;
  searchPlaceholder: string;
  nameHeader: string;
  countryHeader: string;
  companyCodeHeader: string;
  applicantUserCountHeader: string;
  detailLink: string;
  noResultsMessage: string;
}

/**
 * 会社名・販社コードのキーワード絞り込み（要件1.3）を行い、絞り込み後の
 * 会社一覧を表示するクライアント側コンポーネント。
 */
export function CompanyManagementListClient({
  companies,
  countryLabels,
  searchLabel,
  searchPlaceholder,
  nameHeader,
  countryHeader,
  companyCodeHeader,
  applicantUserCountHeader,
  detailLink,
  noResultsMessage,
}: CompanyManagementListClientProps) {
  const [keyword, setKeyword] = useState("");

  const filteredCompanies = useMemo(
    () => filterCompaniesForManagement(companies, keyword),
    [companies, keyword]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="helpdesk-company-search">{searchLabel}</Label>
        <Input
          id="helpdesk-company-search"
          value={keyword}
          placeholder={searchPlaceholder}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </div>

      {filteredCompanies.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{noResultsMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{nameHeader}</th>
                  <th className="py-2 pr-4 font-medium">{countryHeader}</th>
                  <th className="py-2 pr-4 font-medium">{companyCodeHeader}</th>
                  <th className="py-2 pr-4 font-medium">
                    {applicantUserCountHeader}
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    <span className="sr-only">{detailLink}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCompanies.map((company) => (
                  <tr key={company.id}>
                    <td className="py-3 pr-4 font-medium text-foreground">
                      {company.name}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {countryLabels[company.country] ?? company.country}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {company.companyCode}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {company.applicantUserCount}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Link
                        href={`/helpdesk/companies/${company.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {detailLink}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
