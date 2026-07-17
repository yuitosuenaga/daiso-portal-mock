"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { SelectOption } from "@/components/ui/select";
import { EMPTY_INQUIRY_FILTERS, filterInquiries } from "@/lib/inquiry-filter";
import { InquiryFilterBar } from "@/components/features/inquiry-list/InquiryFilterBar";
import { InquiryListItem } from "@/components/features/inquiry-list/InquiryListItem";
import type { Inquiry } from "@/types/inquiry";

export interface InquiryListClientProps {
  /** 送信日時降順で整列済みの問い合わせ一覧 */
  inquiries: Inquiry[];
  categoryLabels: Record<Inquiry["category"], string>;
  categoryOptions: SelectOption[];
  statusOptions: SelectOption[];
  urgencyLabels: Record<Inquiry["urgency"], string>;
  statusLabels: Record<Inquiry["status"], string>;
  statusFieldLabel: string;
  urgencyFieldLabel: string;
  locale: string;
  untitledLabel: string;
  /** ヘルプデスク起点の未読対応履歴（新着）がある問い合わせのID一覧 */
  unreadInquiryIds?: string[];
  /** 新着インジケーターの表示文言 */
  newBadgeLabel?: string;
}

/**
 * フィルタ条件の状態を保持し、`InquiryFilterBar` と `InquiryListItem` の
 * 一覧をクライアント側で結線するコンポーネント。
 */
export function InquiryListClient({
  inquiries,
  categoryLabels,
  categoryOptions,
  statusOptions,
  urgencyLabels,
  statusLabels,
  statusFieldLabel,
  urgencyFieldLabel,
  locale,
  untitledLabel,
  unreadInquiryIds = [],
  newBadgeLabel = "",
}: InquiryListClientProps) {
  const t = useTranslations("inquiryList.filter");
  const [filters, setFilters] = useState(EMPTY_INQUIRY_FILTERS);

  const filteredInquiries = useMemo(
    () => filterInquiries(inquiries, filters),
    [inquiries, filters]
  );

  const unreadInquiryIdSet = useMemo(
    () => new Set(unreadInquiryIds),
    [unreadInquiryIds]
  );

  return (
    <div className="space-y-4">
      <InquiryFilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_INQUIRY_FILTERS)}
        statusOptions={statusOptions}
        categoryOptions={categoryOptions}
      />
      {filteredInquiries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {filteredInquiries.map((item) => (
            <InquiryListItem
              key={item.id}
              inquiry={item}
              categoryLabel={categoryLabels[item.category]}
              urgencyLabel={urgencyLabels[item.urgency]}
              statusLabel={statusLabels[item.status]}
              statusFieldLabel={statusFieldLabel}
              urgencyFieldLabel={urgencyFieldLabel}
              locale={locale}
              untitledLabel={untitledLabel}
              hasUnreadReply={unreadInquiryIdSet.has(item.id)}
              newBadgeLabel={newBadgeLabel}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
