"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { SelectOption } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  EMPTY_HELPDESK_INQUIRY_FILTERS,
  filterInquiriesForHelpdesk,
  type HelpdeskInquiryFilters,
} from "@/lib/helpdesk-inquiry-list";
import { computeHelpdeskInquiryStats } from "@/lib/helpdesk-inquiry-stats";
import { toggleFilterPatch } from "@/lib/filter-toggle";
import { HelpdeskInquiryFilterBar } from "@/components/features/helpdesk-inquiries/HelpdeskInquiryFilterBar";
import { HelpdeskInquiryListItem } from "@/components/features/helpdesk-inquiries/HelpdeskInquiryListItem";
import { HelpdeskInquiryStatsPanel } from "@/components/features/helpdesk-inquiries/HelpdeskInquiryStatsPanel";
import type { Inquiry } from "@/types/inquiry";

export interface HelpdeskInquiryListClientProps {
  /**
   * `sortInquiriesForHelpdesk` で対応状況（新規→対応中→解決済み）→緊急度（高→中→低）→
   * 受付日時昇順の順にソート済みの問い合わせ一覧
   */
  inquiries: Inquiry[];
  categoryLabels: Record<Inquiry["category"], string>;
  urgencyLabels: Record<Inquiry["urgency"], string>;
  statusLabels: Record<Inquiry["status"], string>;
  countryLabels: Record<string, string>;
  countryOptions: SelectOption[];
  categoryOptions: SelectOption[];
  statusOptions: SelectOption[];
  urgencyOptions: SelectOption[];
  claimBadgeLabel: string;
  claimedByLabel: string;
  locale: string;
  untitledLabel: string;
  /**
   * 集計・フィルタ判定の基準時刻（ISO文字列）。ダッシュボードから渡された基準時刻を使うことで、
   * サーバー描画時とクライアント描画時で「現在時刻」がずれてハイドレーション不一致にならないようにする。
   * 未指定時は`new Date()`（従来の挙動）。
   */
  nowIso?: string;
  /** ログイン中ヘルプデスク担当者の表示名。「自分の担当」KPIの判定に使う。未指定時は集計対象外 */
  currentStaffName?: string | null;
  /** ダッシュボード等からのディープリンクで復元された初期フィルタ値。未指定時は空フィルタ */
  initialFilters?: HelpdeskInquiryFilters;
}

/**
 * フィルタ条件の状態を保持し、`HelpdeskInquiryFilterBar` と
 * `HelpdeskInquiryListItem` の一覧をクライアント側で結線するコンポーネント。
 */
export function HelpdeskInquiryListClient({
  inquiries,
  categoryLabels,
  urgencyLabels,
  statusLabels,
  countryLabels,
  countryOptions,
  categoryOptions,
  statusOptions,
  urgencyOptions,
  claimBadgeLabel,
  claimedByLabel,
  locale,
  untitledLabel,
  nowIso,
  currentStaffName,
  initialFilters,
}: HelpdeskInquiryListClientProps) {
  const t = useTranslations("helpdeskInquiries.list");
  const [filters, setFilters] = useState(
    initialFilters ?? EMPTY_HELPDESK_INQUIRY_FILTERS
  );
  const listSectionRef = useRef<HTMLDivElement>(null);

  const referenceDate = useMemo(
    () => (nowIso ? new Date(nowIso) : new Date()),
    [nowIso]
  );

  const staffOptions = useMemo<SelectOption[]>(() => {
    const staffNames = new Set<string>();
    for (const inquiry of inquiries) {
      if (inquiry.claim?.staffName) {
        staffNames.add(inquiry.claim.staffName);
      }
    }
    return Array.from(staffNames)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [inquiries]);

  const filteredInquiries = useMemo(
    () => filterInquiriesForHelpdesk(inquiries, filters, { referenceDate }),
    [inquiries, filters, referenceDate]
  );

  const stats = useMemo(
    () =>
      computeHelpdeskInquiryStats(filteredInquiries, {
        referenceDate,
        currentStaffName: currentStaffName ?? undefined,
      }),
    [filteredInquiries, referenceDate, currentStaffName]
  );

  function handleFilterChange(patch: Partial<HelpdeskInquiryFilters>) {
    setFilters((prev) => ({
      ...prev,
      ...toggleFilterPatch(prev, patch, EMPTY_HELPDESK_INQUIRY_FILTERS),
    }));
    listSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5">
          <HelpdeskInquiryFilterBar
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_HELPDESK_INQUIRY_FILTERS)}
            countryOptions={countryOptions}
            categoryOptions={categoryOptions}
            statusOptions={statusOptions}
            urgencyOptions={urgencyOptions}
            staffOptions={staffOptions}
          />
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <aside aria-labelledby="helpdesk-inquiry-stats-heading" className="xl:order-2 xl:sticky xl:top-20">
          <HelpdeskInquiryStatsPanel
            stats={stats}
            statusLabels={statusLabels}
            categoryLabels={categoryLabels}
            countryLabels={countryLabels}
            locale={locale}
            currentStaffName={currentStaffName}
            shown={filteredInquiries.length}
            total={inquiries.length}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </aside>

        <div ref={listSectionRef} className="min-w-0 xl:order-1">
          <Card>
            <CardContent className="p-5">
              {filteredInquiries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noResults")}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredInquiries.map((inquiry) => (
                    <HelpdeskInquiryListItem
                      key={inquiry.id}
                      inquiry={inquiry}
                      categoryLabel={categoryLabels[inquiry.category]}
                      urgencyLabel={urgencyLabels[inquiry.urgency]}
                      statusLabel={statusLabels[inquiry.status]}
                      countryLabel={
                        countryLabels[inquiry.submittedBy.country] ??
                        inquiry.submittedBy.country
                      }
                      claimBadgeLabel={claimBadgeLabel}
                      claimedByLabel={claimedByLabel}
                      locale={locale}
                      untitledLabel={untitledLabel}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
