import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { InquiryStatsPanel } from "@/components/features/inquiry-list/InquiryStatsPanel";
import type { ApplicantInquiryStats } from "@/lib/inquiry-stats";
import { EMPTY_INQUIRY_FILTERS, type InquiryFilters } from "@/lib/inquiry-filter";
import messages from "../../../../messages/ja.json";

const statusLabels = { new: "新規", in_progress: "対応中", resolved: "解決済み" };
const urgencyLabels = { high: "高", medium: "中", low: "低" };

function renderWithProvider(jsx: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      {jsx}
    </NextIntlClientProvider>
  );
}

function buildStats(overrides: Partial<ApplicantInquiryStats> = {}): ApplicantInquiryStats {
  return {
    total: 10,
    byStatus: { new: 3, in_progress: 4, resolved: 3 },
    unresolved: 7,
    unread: 2,
    awaitingResponse: 3,
    highUrgencyUnresolved: 0,
    byUrgencyUnresolved: { high: 0, medium: 4, low: 3 },
    byCategory: { defect: 3, order: 3, system: 2, other: 2 },
    unresolvedAging: { lt24h: 3, h24to72: 2, d3to7: 1, gte7d: 1 },
    oldestUnresolvedHours: null,
    staleAwaitingResponse: 0,
    dailyIntake: [],
    todayCount: 1,
    ...overrides,
  };
}

function buildFilters(overrides: Partial<InquiryFilters> = {}): InquiryFilters {
  return { ...EMPTY_INQUIRY_FILTERS, ...overrides };
}

describe("InquiryStatsPanel", () => {
  it("未確認の新着件数をヒーロー数値として表示する", () => {
    const { container } = renderWithProvider(
      <InquiryStatsPanel
        stats={buildStats({ unread: 2 })}
        statusLabels={statusLabels}
        urgencyLabels={urgencyLabels}
        shown={10}
        total={10}
        filters={buildFilters()}
      />
    );

    expect(container.querySelector(".text-5xl")?.textContent).toBe("2");
  });

  it("未解決の緊急度高が1件以上あるとき警告を表示する", () => {
    renderWithProvider(
      <InquiryStatsPanel
        stats={buildStats({ highUrgencyUnresolved: 1 })}
        statusLabels={statusLabels}
        urgencyLabels={urgencyLabels}
        shown={10}
        total={10}
        filters={buildFilters()}
      />
    );

    expect(screen.getByText("緊急度「高」の未解決が1件")).toBeTruthy();
  });

  it("未確認が0件のとき安心メッセージを表示する", () => {
    renderWithProvider(
      <InquiryStatsPanel
        stats={buildStats({ unread: 0 })}
        statusLabels={statusLabels}
        urgencyLabels={urgencyLabels}
        shown={10}
        total={10}
        filters={buildFilters()}
      />
    );

    expect(screen.getByText("未確認の更新はありません")).toBeTruthy();
  });

  it("未確認のヒーロー数値をクリックするとunreadOnly絞り込みを通知する", () => {
    const onFilterChange = vi.fn();
    renderWithProvider(
      <InquiryStatsPanel
        stats={buildStats({ unread: 2 })}
        statusLabels={statusLabels}
        urgencyLabels={urgencyLabels}
        shown={10}
        total={10}
        filters={buildFilters()}
        onFilterChange={onFilterChange}
      />
    );

    screen.getByText("2").closest("button")?.click();
    expect(onFilterChange).toHaveBeenCalledWith({ unreadOnly: true });
  });

  it("回答待ちの数値をクリックするとstatus=new絞り込みを通知する", () => {
    const onFilterChange = vi.fn();
    const { container } = renderWithProvider(
      <InquiryStatsPanel
        stats={buildStats({ awaitingResponse: 3 })}
        statusLabels={statusLabels}
        urgencyLabels={urgencyLabels}
        shown={10}
        total={10}
        filters={buildFilters()}
        onFilterChange={onFilterChange}
      />
    );

    container.querySelector(".text-2xl")?.closest("button")?.click();
    expect(onFilterChange).toHaveBeenCalledWith({ status: "new" });
  });
});
