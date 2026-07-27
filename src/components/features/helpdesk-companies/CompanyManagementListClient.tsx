"use client";

import { useMemo, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { filterCompaniesForManagement } from "@/lib/helpdesk-company-list";
import { formatTemplate } from "@/lib/format-template";
import { deactivateCompaniesApplicantUsersAction } from "@/lib/actions/companies";
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
  /** チェックボックス列ヘッダー（全選択）のラベル。 */
  selectAllLabel: string;
  /** 各行チェックボックスの`aria-label`テンプレート。`{name}`を会社名に置き換える。 */
  selectRowLabelTemplate: string;
  /** 選択件数表示のテンプレート。`{count}`を選択中の会社数に置き換える。 */
  selectedCountTemplate: string;
  bulkDeactivateButtonLabel: string;
  confirmTitle: string;
  /** 確認モーダル本文のテンプレート。`{companyCount}`・`{userCount}`を置き換える。 */
  confirmMessageTemplate: string;
  confirmButtonLabel: string;
  cancelButtonLabel: string;
  /** 成功メッセージのテンプレート。`{count}`を実際の無効化件数に置き換える。 */
  successMessageTemplate: string;
  errorMessage: string;
}

/**
 * 会社名・販社コードのキーワード絞り込み（要件1.3）に加え、チェックボックスによる
 * 複数選択・一括無効化（要件20）を行うクライアント側コンポーネント。
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
  selectAllLabel,
  selectRowLabelTemplate,
  selectedCountTemplate,
  bulkDeactivateButtonLabel,
  confirmTitle,
  confirmMessageTemplate,
  confirmButtonLabel,
  cancelButtonLabel,
  successMessageTemplate,
  errorMessage,
}: CompanyManagementListClientProps) {
  const [keyword, setKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const filteredCompanies = useMemo(
    () => filterCompaniesForManagement(companies, keyword),
    [companies, keyword]
  );

  // 確認モーダルに表示する対象は、検索絞り込みで一時的に非表示になった選択も含む
  // 「実際に一括無効化される全選択」でなければならない（`selectedIds`自体は絞り込みに
  // 関わらず維持される）。`filteredCompanies`から算出すると、選択済みの会社が検索
  // キーワードで一覧から外れた際に対象0件と誤表示されたまま実際には無効化されて
  // しまう（要件20.3・20.4の誤操作防止に反する）ため、必ず全件`companies`から算出する。
  const selectedCompanies = useMemo(
    () => companies.filter((company) => selectedIds.has(company.id)),
    [companies, selectedIds]
  );

  const activeUserCountTotal = useMemo(
    () =>
      selectedCompanies.reduce(
        (total, company) => total + company.activeApplicantUserCount,
        0
      ),
    [selectedCompanies]
  );

  const allFilteredSelected =
    filteredCompanies.length > 0 &&
    filteredCompanies.every((company) => selectedIds.has(company.id));

  function toggleRow(companyId: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
    setSuccessCount(null);
  }

  function toggleSelectAll() {
    setSelectedIds((previous) => {
      if (allFilteredSelected) {
        const next = new Set(previous);
        for (const company of filteredCompanies) {
          next.delete(company.id);
        }
        return next;
      }

      const next = new Set(previous);
      for (const company of filteredCompanies) {
        next.add(company.id);
      }
      return next;
    });
    setSuccessCount(null);
  }

  function handleConfirmDeactivate() {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await deactivateCompaniesApplicantUsersAction(
            Array.from(selectedIds)
          );
          setHasError(false);
          setSuccessCount(result.deactivatedCount);
          setSelectedIds(new Set());
          resolve();
        } catch {
          setHasError(true);
          reject(new Error("failed to bulk deactivate companies"));
        }
      });
    });
  }

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {formatTemplate(selectedCountTemplate, { count: selectedIds.size })}
        </p>
        <div className="flex items-center gap-3">
          <ConfirmDialog
            triggerLabel={bulkDeactivateButtonLabel}
            triggerVariant="destructive"
            triggerDisabled={selectedIds.size === 0 || isPending}
            title={confirmTitle}
            description={formatTemplate(confirmMessageTemplate, {
              companyCount: selectedCompanies.length,
              userCount: activeUserCountTotal,
            })}
            confirmLabel={confirmButtonLabel}
            cancelLabel={cancelButtonLabel}
            confirmVariant="destructive"
            isPending={isPending}
            onConfirm={handleConfirmDeactivate}
          />
          {hasError && !isPending && (
            <span role="status" className="text-sm text-destructive">
              {errorMessage}
            </span>
          )}
        </div>
      </div>

      {successCount !== null && !hasError && (
        <p role="status" className="text-sm text-foreground">
          {formatTemplate(successMessageTemplate, { count: successCount })}
        </p>
      )}

      {filteredCompanies.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{noResultsMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">
                    <input
                      type="checkbox"
                      aria-label={selectAllLabel}
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </th>
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
                    <td className="py-3 pr-4">
                      <input
                        type="checkbox"
                        aria-label={formatTemplate(selectRowLabelTemplate, {
                          name: company.name,
                        })}
                        checked={selectedIds.has(company.id)}
                        onChange={() => toggleRow(company.id)}
                        className="h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
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
