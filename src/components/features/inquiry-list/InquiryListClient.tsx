"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { SelectOption } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  EMPTY_INQUIRY_FILTERS,
  filterInquiries,
  normalizeInquiryFilters,
  type InquiryFilters,
} from "@/lib/inquiry-filter";
import { computeApplicantInquiryStats } from "@/lib/inquiry-stats";
import { toggleFilterPatch } from "@/lib/filter-toggle";
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
  /**
   * 集計・フィルタ判定の基準時刻（ISO文字列）。ダッシュボードから渡された基準時刻を使うことで、
   * サーバー描画時とクライアント描画時で「現在時刻」がずれてハイドレーション不一致にならないようにする。
   * 未指定時は`new Date()`（従来の挙動）。
   */
  nowIso?: string;
  /** ダッシュボード等からのディープリンクで復元された初期フィルタ値。未指定時は空フィルタ */
  initialFilters?: InquiryFilters;
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
  nowIso,
  initialFilters,
}: InquiryListClientProps) {
  const t = useTranslations("inquiryList.filter");
  const [filters, setFilters] = useState(initialFilters ?? EMPTY_INQUIRY_FILTERS);
  const listSectionRef = useRef<HTMLDivElement>(null);

  const referenceDate = useMemo(
    () => (nowIso ? new Date(nowIso) : new Date()),
    [nowIso]
  );

  const unreadInquiryIdSet = useMemo(
    () => new Set(unreadInquiryIds),
    [unreadInquiryIds]
  );

  const filteredInquiries = useMemo(
    () =>
      filterInquiries(inquiries, filters, {
        unreadInquiryIds: unreadInquiryIdSet,
        referenceDate,
      }),
    [inquiries, filters, unreadInquiryIdSet, referenceDate]
  );

  const stats = useMemo(
    () =>
      computeApplicantInquiryStats(filteredInquiries, {
        unreadInquiryIds: unreadInquiryIdSet,
        referenceDate,
      }),
    [filteredInquiries, unreadInquiryIdSet, referenceDate]
  );

  /**
   * サマリパネルのクリック（StatsPanel）由来のフィルタ変更。トグル解除の判定
   * （`toggleFilterPatch`）を経たうえで、最終結果を必ず`normalizeInquiryFilters`に
   * 通し、他の経路（フィルタバー）からの変更と組み合わさっても矛盾した状態
   * （例: status=resolvedとunresolvedOnly=trueの同時成立）に到達しないようにする。
   */
  function handleFilterChange(patch: Partial<InquiryFilters>) {
    setFilters((prev) => {
      const merged = {
        ...prev,
        ...toggleFilterPatch(prev, patch, EMPTY_INQUIRY_FILTERS),
      };
      return normalizeInquiryFilters(
        merged,
        Object.keys(patch) as (keyof InquiryFilters)[]
      );
    });
    listSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  /**
   * フィルタバー（`InquiryFilterBar`）由来のフィルタ変更。フィルタバーは
   * 各コントロールが完全な`InquiryFilters`オブジェクトを構築して渡す設計のため、
   * 直前の`filters`と比較して実際に変わったキーを求め、`normalizeInquiryFilters`に
   * 「今回明示的に変更されたキー」として渡す（矛盾解消時にどちらの値を優先するかの
   * 判定に使われる）。
   */
  function handleFilterBarChange(next: InquiryFilters) {
    const changedKeys = (Object.keys(next) as (keyof InquiryFilters)[]).filter(
      (key) => filters[key] !== next[key]
    );
    setFilters(normalizeInquiryFilters(next, changedKeys));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5">
          <InquiryFilterBar
            filters={filters}
            onChange={handleFilterBarChange}
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
            categoryLabels={categoryLabels}
            locale={locale}
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
