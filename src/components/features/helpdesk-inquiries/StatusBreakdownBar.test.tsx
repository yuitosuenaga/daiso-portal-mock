import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import { StatusBreakdownBar } from "@/components/features/helpdesk-inquiries/StatusBreakdownBar";
import messages from "../../../../messages/ja.json";

const statusLabels = { new: "新規", in_progress: "対応中", resolved: "解決済み" };

function renderWithProvider(jsx: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      {jsx}
    </NextIntlClientProvider>
  );
}

describe("StatusBreakdownBar", () => {
  it("各ステータスの件数を凡例に表示する", () => {
    renderWithProvider(
      <StatusBreakdownBar
        segments={[
          { status: "new", count: 3, percent: 30 },
          { status: "in_progress", count: 2, percent: 20 },
          { status: "resolved", count: 5, percent: 50 },
        ]}
        statusLabels={statusLabels}
      />
    );

    expect(screen.getByText("新規")).toBeTruthy();
    expect(screen.getByText("3件")).toBeTruthy();
    expect(screen.getByText("解決済み")).toBeTruthy();
    expect(screen.getByText("5件")).toBeTruthy();
  });

  it("件数0のセグメントはバーに描画しない", () => {
    renderWithProvider(
      <StatusBreakdownBar
        segments={[{ status: "new", count: 4, percent: 100 }]}
        statusLabels={statusLabels}
      />
    );

    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
