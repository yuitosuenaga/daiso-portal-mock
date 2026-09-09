import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UrgencyBreakdownBarList } from "@/components/features/inquiry-stats/UrgencyBreakdownBarList";

const urgencyLabels = { high: "高", medium: "中", low: "低" };

describe("UrgencyBreakdownBarList", () => {
  it("high/medium/lowの件数を表示する", () => {
    render(
      <UrgencyBreakdownBarList
        rows={[
          { urgency: "high", count: 2, barPercent: 100 },
          { urgency: "medium", count: 1, barPercent: 50 },
          { urgency: "low", count: 0, barPercent: 0 },
        ]}
        urgencyLabels={urgencyLabels}
        unitLabel="件"
        emptyMessage="未解決の問合せはありません"
      />
    );

    expect(screen.getByText("高")).toBeTruthy();
    expect(screen.getByText("2件")).toBeTruthy();
    expect(screen.getByText("低")).toBeTruthy();
  });

  it("全行0件のとき空状態メッセージを表示する", () => {
    render(
      <UrgencyBreakdownBarList
        rows={[
          { urgency: "high", count: 0, barPercent: 0 },
          { urgency: "medium", count: 0, barPercent: 0 },
          { urgency: "low", count: 0, barPercent: 0 },
        ]}
        urgencyLabels={urgencyLabels}
        unitLabel="件"
        emptyMessage="未解決の問合せはありません"
      />
    );

    expect(screen.getByText("未解決の問合せはありません")).toBeTruthy();
  });

  it("onSelectを指定すると行クリックでコールバックが呼ばれる", () => {
    const onSelect = vi.fn();
    render(
      <UrgencyBreakdownBarList
        rows={[
          { urgency: "high", count: 2, barPercent: 100 },
          { urgency: "medium", count: 0, barPercent: 0 },
          { urgency: "low", count: 0, barPercent: 0 },
        ]}
        urgencyLabels={urgencyLabels}
        unitLabel="件"
        emptyMessage="未解決の問合せはありません"
        onSelect={onSelect}
      />
    );

    screen.getByText("高").closest("button")?.click();
    expect(onSelect).toHaveBeenCalledWith("high");
  });
});
