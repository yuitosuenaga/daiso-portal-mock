"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { SelectOption } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  EMPTY_INQUIRY_FILTERS,
  filterInquiries,
  type InquiryFilters,
} from "@/lib/inquiry-filter";
import { computeApplicantInquiryStats } from "@/lib/inquiry-stats";
import { InquiryFilterBar } from "@/components/features/inquiry-list/InquiryFilterBar";
import { InquiryListItem } from "@/components/features/inquiry-list/InquiryListItem";
import { InquiryStatsPanel } from "@/components/features/inquiry-list/InquiryStatsPanel";
import type { Inquiry } from "@/types/inquiry";

export interface InquiryListClientProps {
  /** 送信日時降順で整列済みの問い合わせ一覧 */
  inquiries: Inquiry[];
  categoryLabels: Record<Inquiry["category"], string>;
  categoryOptions: SelectOption[];
  statusOptions: SelectOption[];
  urgencyOptions: SelectOption[];
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
 * パッチで指定されたキーが既に同じ値になっている場合は、そのキーだけ空値に戻す（トグル解除）。
 * サマリパネルの各要素（ボタン化されたグラフの区間・行）を再クリックしたときに、
 * 絞り込みを解除できるようにするための処理。
 */
function toggleFilterPatch(
  current: InquiryFilters,
  patch: Partial<InquiryFilters>
): Partial<InquiryFilters> {
  const resolved: Partial<InquiryFilters> = { ...patch };
  for (const key of Object.keys(patch) as (keyof InquiryFilters)[]) {
    if (current[key] === patch[key]) {
      (resolved as Record<string, unknown>)[key] = EMPTY_INQUIRY_FILTERS[key];
    }
  }
  return resolved;
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
  urgencyOptions,
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
  const listSectionRef = useRef<HTMLDivElement>(null);

  const unreadInquiryIdSet = useMemo(
    () => new Set(unreadInquiryIds),
    [unreadInquiryIds]
  );

  const filteredInquiries = useMemo(
    () => filterInquiries(inquiries, filters, { unreadInquiryIds: unreadInquiryIdSet }),
    [inquiries, filters, unreadInquiryIdSet]
  );

  const stats = useMemo(
    () =>
      computeApplicantInquiryStats(filteredInquiries, {
        unreadInquiryIds: unreadInquiryIdSet,
      }),
    [filteredInquiries, unreadInquiryIdSet]
  );

  function handleFilterChange(patch: Partial<InquiryFilters>) {
    setFilters((prev) => ({ ...prev, ...toggleFilterPatch(prev, patch) }));
    listSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5">
          <InquiryFilterBar
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_INQUIRY_FILTERS)}
            statusOptions={statusOptions}
            categoryOptions={categoryOptions}
            urgencyOptions={urgencyOptions}
          />
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <aside aria-labelledby="inquiry-stats-heading" className="xl:order-2 xl:sticky xl:top-20">
          <InquiryStatsPanel
            stats={stats}
            statusLabels={statusLabels}
            urgencyLabels={urgencyLabels}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
