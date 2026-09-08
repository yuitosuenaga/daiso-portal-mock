import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import { StaffLoadBarList } from "@/components/features/helpdesk-inquiries/StaffLoadBarList";
import messages from "../../../../messages/ja.json";

function renderWithProvider(jsx: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      {jsx}
    </NextIntlClientProvider>
  );
}

describe("StaffLoadBarList", () => {
  it("未着手行と担当者別の件数を表示する", () => {
    renderWithProvider(
      <StaffLoadBarList
        rows={[
          { key: "unclaimed", kind: "unclaimed", label: null, count: 3, barPercent: 60 },
          { key: "staff:田中", kind: "staff", label: "田中", count: 5, barPercent: 100 },
        ]}
      />
    );

    expect(screen.getByText("未着手")).toBeTruthy();
    expect(screen.getByText("田中")).toBeTruthy();
    expect(screen.getByText("5件")).toBeTruthy();
  });

  it("担当者がいない場合は空状態メッセージを表示する", () => {
    renderWithProvider(
      <StaffLoadBarList
        rows={[
          { key: "unclaimed", kind: "unclaimed", label: null, count: 0, barPercent: 0 },
        ]}
      />
    );

    expect(screen.getByText("対応中の問合せはありません")).toBeTruthy();
  });

  it("othersの行数（staffCount）を「ほかN名」として表示する", () => {
    renderWithProvider(
      <StaffLoadBarList
        rows={[
          { key: "unclaimed", kind: "unclaimed", label: null, count: 0, barPercent: 0 },
          {
            key: "others",
            kind: "others",
            label: null,
            count: 4,
            staffCount: 3,
            barPercent: 40,
          },
        ]}
      />
    );

    expect(screen.getByText("ほか3名")).toBeTruthy();
  });
});
