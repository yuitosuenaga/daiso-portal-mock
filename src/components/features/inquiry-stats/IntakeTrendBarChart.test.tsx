import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IntakeTrendBarChart } from "@/components/features/inquiry-stats/IntakeTrendBarChart";
import type { IntakeTrendColumn } from "@/lib/inquiry-intake-trend";

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

const columns: IntakeTrendColumn[] = [
  { dateKey: "2026-09-08", count: 0, heightPercent: 0 },
  { dateKey: "2026-09-09", count: 2, heightPercent: 50 },
  { dateKey: "2026-09-10", count: 4, heightPercent: 100 },
];

const ariaLabelByDateKey: Record<string, string> = {
  "2026-09-08": "9/8: 0件",
  "2026-09-09": "9/9: 2件",
  "2026-09-10": "9/10: 4件",
};

describe("IntakeTrendBarChart", () => {
  it("静的モード（onSelectDateKey/hrefByDateKey未指定）ではdiv要素として各列にaria-labelを表示する", () => {
    render(
      <IntakeTrendBarChart
        columns={columns}
        locale="ja"
        unitLabel="件"
        emptyMessage="直近7日の受付はありません"
        ariaLabelByDateKey={ariaLabelByDateKey}
      />
    );

    expect(screen.getByLabelText("9/10: 4件")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("hrefByDateKeyを指定すると各列がLinkになる", () => {
    render(
      <IntakeTrendBarChart
        columns={columns}
        locale="ja"
        unitLabel="件"
        emptyMessage="直近7日の受付はありません"
        ariaLabelByDateKey={ariaLabelByDateKey}
        hrefByDateKey={{ "2026-09-10": "/inquiry?date=2026-09-10" }}
      />
    );

    const link = screen.getByRole("link", { name: "9/10: 4件" });
    expect(link.getAttribute("href")).toBe("/inquiry?date=2026-09-10");
  });

  it("onSelectDateKeyを指定すると各列がbuttonになり、クリックでdateKeyを通知する", () => {
    const onSelectDateKey = vi.fn();
    render(
      <IntakeTrendBarChart
        columns={columns}
        locale="ja"
        unitLabel="件"
        emptyMessage="直近7日の受付はありません"
        ariaLabelByDateKey={ariaLabelByDateKey}
        onSelectDateKey={onSelectDateKey}
      />
    );

    screen.getByRole("button", { name: "9/10: 4件" }).click();
    expect(onSelectDateKey).toHaveBeenCalledWith("2026-09-10");
  });

  it("selectedDateKeyと一致する列はaria-pressed=trueになる", () => {
    render(
      <IntakeTrendBarChart
        columns={columns}
        locale="ja"
        unitLabel="件"
        emptyMessage="直近7日の受付はありません"
        ariaLabelByDateKey={ariaLabelByDateKey}
        onSelectDateKey={vi.fn()}
        selectedDateKey="2026-09-10"
      />
    );

    expect(
      screen.getByRole("button", { name: "9/10: 4件" }).getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "9/9: 2件" }).getAttribute("aria-pressed")
    ).toBe("false");
  });

  it("全列0件のときemptyMessageを表示する", () => {
    render(
      <IntakeTrendBarChart
        columns={columns.map((column) => ({ ...column, count: 0, heightPercent: 0 }))}
        locale="ja"
        unitLabel="件"
        emptyMessage="直近7日の受付はありません"
        ariaLabelByDateKey={ariaLabelByDateKey}
      />
    );

    expect(screen.getByText("直近7日の受付はありません")).toBeTruthy();
  });

  it("各列に件数と日付ラベルを表示する", () => {
    render(
      <IntakeTrendBarChart
        columns={columns}
        locale="ja"
        unitLabel="件"
        emptyMessage="直近7日の受付はありません"
        ariaLabelByDateKey={ariaLabelByDateKey}
      />
    );

    expect(screen.getByText("4件")).toBeTruthy();
    expect(screen.getByText("2件")).toBeTruthy();
  });
});
