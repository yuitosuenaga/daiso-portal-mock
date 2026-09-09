import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StatusBreakdownBar } from "@/components/features/inquiry-stats/StatusBreakdownBar";

const statusLabels = { new: "新規", in_progress: "対応中", resolved: "解決済み" };

describe("StatusBreakdownBar", () => {
  it("各ステータスの件数を凡例に表示する", () => {
    render(
      <StatusBreakdownBar
        segments={[
          { status: "new", count: 3, percent: 30 },
          { status: "in_progress", count: 2, percent: 20 },
          { status: "resolved", count: 5, percent: 50 },
        ]}
        statusLabels={statusLabels}
        unitLabel="件"
      />
    );

    expect(screen.getByText("新規")).toBeTruthy();
    expect(screen.getByText("3件")).toBeTruthy();
    expect(screen.getByText("解決済み")).toBeTruthy();
    expect(screen.getByText("5件")).toBeTruthy();
  });

  it("件数0のセグメントはバーに描画しない", () => {
    render(
      <StatusBreakdownBar
        segments={[{ status: "new", count: 4, percent: 100 }]}
        statusLabels={statusLabels}
        unitLabel="件"
      />
    );

    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("onSelectを指定するとセグメント・凡例がクリック可能になる", () => {
    const onSelect = vi.fn();
    render(
      <StatusBreakdownBar
        segments={[
          { status: "new", count: 3, percent: 60 },
          { status: "resolved", count: 2, percent: 40 },
        ]}
        statusLabels={statusLabels}
        unitLabel="件"
        onSelect={onSelect}
      />
    );

    // セグメント2つ・凡例2つ = 4ボタン
    expect(screen.getAllByRole("button")).toHaveLength(4);
    screen.getByText("新規").closest("button")?.click();
    expect(onSelect).toHaveBeenCalledWith("new");
  });

  it("selectedStatusに一致する凡例にaria-pressed=trueを付与する", () => {
    render(
      <StatusBreakdownBar
        segments={[{ status: "new", count: 3, percent: 100 }]}
        statusLabels={statusLabels}
        unitLabel="件"
        selectedStatus="new"
        onSelect={() => {}}
      />
    );

    const legendButton = screen.getByText("新規").closest("button");
    expect(legendButton?.getAttribute("aria-pressed")).toBe("true");
  });
});
