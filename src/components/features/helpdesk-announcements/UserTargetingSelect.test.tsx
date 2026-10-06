import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UserTargetingSelect } from "@/components/features/helpdesk-announcements/UserTargetingSelect";

const searchMock = vi.fn();

vi.mock("@/lib/actions/applicant-users", () => ({
  searchApplicantUsersForTargetingAction: (query: string) => searchMock(query),
}));

const labels = {
  groupLabel: "配信対象の個人",
  searchPlaceholder: "検索",
  searchHint: "検索語を入力してください",
  noResultsMessage: "該当なし",
  searchErrorMessage: "検索失敗",
  selectedCountLabel: "{count}名選択中",
  removeChipButtonLabel: "削除",
  alreadySelectedLabel: "選択済み",
};

const taro = {
  id: "u1",
  displayName: "Taro",
  email: "taro@example.com",
  companyName: "Daiso VN",
  country: "VN",
};

function Harness({ initial = [] as string[] }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <UserTargetingSelect
      id="users"
      value={value}
      onChange={setValue}
      initialUsers={initial.length > 0 ? [taro] : []}
      labels={labels}
    />
  );
}

describe("UserTargetingSelect", () => {
  it("検索結果をクリックすると選択済みチップに追加され、削除もできる", async () => {
    searchMock.mockResolvedValue([taro]);
    render(<Harness />);

    expect(screen.getByText("検索語を入力してください")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("検索"), { target: { value: "tar" } });

    const result = await screen.findByRole("button", { name: /Taro/ });
    expect(searchMock).toHaveBeenCalledWith("tar");
    fireEvent.click(result);

    expect(screen.getByText("1名選択中")).toBeTruthy();
    expect(screen.getByText("Taro（Daiso VN / VN）")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "削除: Taro（Daiso VN / VN）" }));
    expect(screen.getByText("0名選択中")).toBeTruthy();
  });

  it("該当なしのとき案内を表示し、初期選択は氏名で復元される", async () => {
    searchMock.mockResolvedValue([]);
    render(<Harness initial={["u1"]} />);

    expect(screen.getByText("Taro（Daiso VN / VN）")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("検索"), { target: { value: "zzz" } });
    await waitFor(() => expect(screen.getByText("該当なし")).toBeTruthy());
  });
});
