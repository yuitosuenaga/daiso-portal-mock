"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { SelectOption } from "@/components/ui/select";
import {
  EMPTY_HELPDESK_INQUIRY_FILTERS,
  filterInquiriesForHelpdesk,
} from "@/lib/helpdesk-inquiry-list";
import { HelpdeskInquiryFilterBar } from "@/components/features/helpdesk-inquiries/HelpdeskInquiryFilterBar";
import { HelpdeskInquiryListItem } from "@/components/features/helpdesk-inquiries/HelpdeskInquiryListItem";
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
  claimBadgeLabel: string;
  claimedByLabel: string;
  locale: string;
  untitledLabel: string;
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
  claimBadgeLabel,
  claimedByLabel,
  locale,
  untitledLabel,
}: HelpdeskInquiryListClientProps) {
  const t = useTranslations("helpdeskInquiries.list");
  const [filters, setFilters] = useState(EMPTY_HELPDESK_INQUIRY_FILTERS);

  const filteredInquiries = useMemo(
    () => filterInquiriesForHelpdesk(inquiries, filters),
    [inquiries, filters]
  );

  return (
    <div className="space-y-4">
      <HelpdeskInquiryFilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_HELPDESK_INQUIRY_FILTERS)}
        countryOptions={countryOptions}
        categoryOptions={categoryOptions}
        statusOptions={statusOptions}
      />
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
    </div>
  );
}
