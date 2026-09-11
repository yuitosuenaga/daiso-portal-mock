import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { HelpdeskInquiryStatsPanel } from "@/components/features/helpdesk-inquiries/HelpdeskInquiryStatsPanel";
import type { HelpdeskInquiryStats } from "@/lib/helpdesk-inquiry-stats";
import {
  EMPTY_HELPDESK_INQUIRY_FILTERS,
  type HelpdeskInquiryFilters,
} from "@/lib/helpdesk-inquiry-list";
import messages from "../../../../messages/ja.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const statusLabels = { new: "新規", in_progress: "対応中", resolved: "解決済み" };
const categoryLabels = { defect: "不良品", order: "発注", system: "システム", other: "その他" };
const countryLabels: Record<string, string> = { JP: "日本", US: "米国" };

function renderWithProvider(jsx: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      {jsx}
    </NextIntlClientProvider>
  );
}

function buildStats(overrides: Partial<HelpdeskInquiryStats> = {}): HelpdeskInquiryStats {
  return {
    total: 10,
    byStatus: { new: 3, in_progress: 4, resolved: 3 },
    unresolved: 7,
    unclaimed: 2,
    unclaimedHighUrgency: 0,
    claimedByStaff: [{ staffName: "田中", count: 5 }],
    claimedTotal: 5,
    todayCount: 1,
    todayUnresolved: 1,
    byCategory: { defect: 3, order: 3, system: 2, other: 2 },
    byCountry: [],
    unresolvedAging: { lt24h: 3, h24to72: 2, d3to7: 1, gte7d: 1 },
    staleUnclaimed: 0,
    oldestUnclaimedHours: null,
    mine: 0,
    dailyIntake: [],
    ...overrides,
  };
}

function buildFilters(
  overrides: Partial<HelpdeskInquiryFilters> = {}
): HelpdeskInquiryFilters {
  return { ...EMPTY_HELPDESK_INQUIRY_FILTERS, ...overrides };
}

describe("HelpdeskInquiryStatsPanel", () => {
  it("未着手件数をヒーロー数値として表示する", () => {
    const { container } = renderWithProvider(
      <HelpdeskInquiryStatsPanel
        categoryLabels={categoryLabels}
        countryLabels={countryLabels}
        locale="ja"
        stats={buildStats({ unclaimed: 2 })}
        statusLabels={statusLabels}
        shown={10}
        total={10}
        filters={buildFilters()}
      />
    );

    expect(container.querySelector(".text-5xl")?.textContent).toBe("2");
    expect(screen.getAllByText("未着手").length).toBeGreaterThan(0);
  });

  it("緊急度高の未着手が1件以上あるとき警告を表示する", () => {
    renderWithProvider(
      <HelpdeskInquiryStatsPanel
        categoryLabels={categoryLabels}
        countryLabels={countryLabels}
        locale="ja"
        stats={buildStats({ unclaimed: 2, unclaimedHighUrgency: 1 })}
        statusLabels={statusLabels}
        shown={10}
        total={10}
        filters={buildFilters()}
      />
    );

    expect(screen.getByText("緊急度「高」が1件")).toBeTruthy();
  });

  it("未着手が0件のとき安心メッセージを表示する", () => {
    renderWithProvider(
      <HelpdeskInquiryStatsPanel
        categoryLabels={categoryLabels}
        countryLabels={countryLabels}
        locale="ja"
        stats={buildStats({ unclaimed: 0, unclaimedHighUrgency: 0 })}
        statusLabels={statusLabels}
        shown={10}
        total={10}
        filters={buildFilters()}
      />
    );

    expect(
      screen.getByText("未対応の問合せはすべて対応者がついています")
    ).toBeTruthy();
  });

  it("絞り込み中は対象件数の注記を表示する", () => {
    renderWithProvider(
      <HelpdeskInquiryStatsPanel
        categoryLabels={categoryLabels}
        countryLabels={countryLabels}
        locale="ja"
        stats={buildStats({ total: 4 })}
        statusLabels={statusLabels}
        shown={4}
        total={10}
        filters={buildFilters()}
      />
    );

    expect(screen.getByText("絞り込み中の4件が対象")).toBeTruthy();
  });

  it("未着手のヒーロー数値をクリックするとunclaimedOnly絞り込みを通知する", () => {
    const onFilterChange = vi.fn();
    const { container } = renderWithProvider(
      <HelpdeskInquiryStatsPanel
        categoryLabels={categoryLabels}
        countryLabels={countryLabels}
        locale="ja"
        stats={buildStats({ unclaimed: 2 })}
        statusLabels={statusLabels}
        shown={10}
        total={10}
        filters={buildFilters()}
        onFilterChange={onFilterChange}
      />
    );

    container.querySelector(".text-5xl")?.closest("button")?.click();
    expect(onFilterChange).toHaveBeenCalledWith({
      unclaimedOnly: true,
      unresolvedOnly: true,
      urgency: "",
      aging: "",
      claimedBy: "",
    });
  });

  it("対応者行をクリックするとclaimedBy絞り込みを通知する", () => {
    const onFilterChange = vi.fn();
    renderWithProvider(
      <HelpdeskInquiryStatsPanel
        categoryLabels={categoryLabels}
        countryLabels={countryLabels}
        locale="ja"
        stats={buildStats()}
        statusLabels={statusLabels}
        shown={10}
        total={10}
        filters={buildFilters()}
        onFilterChange={onFilterChange}
      />
    );

    screen.getAllByText("田中")[0].closest("button")?.click();
    expect(onFilterChange).toHaveBeenCalledWith({
      claimedBy: "田中",
      unresolvedOnly: true,
      unclaimedOnly: false,
    });
  });
});
