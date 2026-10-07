import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  UserTargetingSelect,
  type TargetingSelection,
} from "@/components/features/helpdesk-announcements/UserTargetingSelect";

const searchMock = vi.fn();

vi.mock("@/lib/actions/applicant-users", () => ({
  searchTargetingCandidatesAction: (query: string) => searchMock(query),
}));

const labels = {
  groupLabel: "配信対象の個人・会社",
  searchPlaceholder: "検索",
  searchHint: "検索語を入力してください",
  noResultsMessage: "該当なし",
  searchErrorMessage: "検索失敗",
  selectedCountLabel: "会社 {companies}社・個人 {users}名を選択中",
  removeChipButtonLabel: "削除",
  alreadySelectedLabel: "選択済み",
  searchingLabel: "検索中",
  resultsCountLabel: "{count}件見つかりました",
  unavailableLabel: "利用不可",
  companyBadgeLabel: "会社",
  userBadgeLabel: "個人",
  companyMembersLabel: "有効アカウント {count}名",
  companyNote: "会社を選ぶと、その会社の有効なアカウント全員に配信されます",
};

const taro = {
  id: "u1",
  displayName: "Taro",
  email: "taro@example.com",
  companyName: "Daiso VN",
  country: "VN",
};

const daisoVn = {
  id: "c1",
  name: "Daiso VN",
  country: "VN",
  companyCode: "daiso-vn",
  activeUserCount: 3,
};

function Harness({
  initial = { userIds: [], companyIds: [] } as TargetingSelection,
}: {
  initial?: TargetingSelection;
}) {
  const [value, setValue] = useState<TargetingSelection>(initial);
  return (
    <UserTargetingSelect
      id="users"
      value={value}
      onChange={setValue}
      initialUsers={initial.userIds.length > 0 ? [taro] : []}
      initialCompanies={initial.companyIds.length > 0 ? [daisoVn] : []}
      labels={labels}
      countryLabels={{ VN: "ベトナム" }}
    />
  );
}

describe("UserTargetingSelect", () => {
  it("検索すると会社と個人が種別ラベル付きの別候補として表示される", async () => {
    searchMock.mockResolvedValue({ companies: [daisoVn], users: [taro] });
    render(<Harness />);

    fireEvent.change(screen.getByPlaceholderText("検索"), { target: { value: "daiso" } });

    const company = await screen.findByRole("button", { name: /会社.*Daiso VN.*有効アカウント 3名/ });
    const user = await screen.findByRole("button", { name: /個人.*Taro.*taro@example.com/ });
    expect(company).toBeTruthy();
    expect(user).toBeTruthy();
    expect(searchMock).toHaveBeenCalledWith("daiso");
    expect(screen.getByText("2件見つかりました")).toBeTruthy();
  });

  it("会社と個人をそれぞれ選択でき、チップに種別が表示され、削除もできる", async () => {
    searchMock.mockResolvedValue({ companies: [daisoVn], users: [taro] });
    render(<Harness />);

    fireEvent.change(screen.getByPlaceholderText("検索"), { target: { value: "daiso" } });
    fireEvent.click(await screen.findByRole("button", { name: /会社.*Daiso VN.*有効アカウント/ }));
    fireEvent.click(await screen.findByRole("button", { name: /個人.*Taro.*taro@example.com/ }));

    expect(screen.getByText("会社 1社・個人 1名を選択中")).toBeTruthy();
    expect(screen.getByText("Daiso VN (ベトナム)")).toBeTruthy();
    expect(screen.getByText("Taro (Daiso VN / ベトナム)")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "削除: 会社 Daiso VN (ベトナム)" }));
    expect(screen.getByText("会社 0社・個人 1名を選択中")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "削除: 個人 Taro (Daiso VN / ベトナム)" })
    );
    expect(screen.getByText("会社 0社・個人 0名を選択中")).toBeTruthy();
  });

  it("選択済みの候補は選択済み表示になり再選択できない", async () => {
    searchMock.mockResolvedValue({ companies: [daisoVn], users: [] });
    render(<Harness initial={{ userIds: [], companyIds: ["c1"] }} />);

    fireEvent.change(screen.getByPlaceholderText("検索"), { target: { value: "daiso" } });
    const company = await screen.findByRole("button", { name: /^会社 Daiso VN 選択済み/ });

    expect(company.hasAttribute("disabled")).toBe(true);
  });

  it("該当なしのとき案内を表示し、初期選択は名称で復元される", async () => {
    searchMock.mockResolvedValue({ companies: [], users: [] });
    render(<Harness initial={{ userIds: ["u1"], companyIds: ["c1"] }} />);

    expect(screen.getByText("Taro (Daiso VN / ベトナム)")).toBeTruthy();
    expect(screen.getByText("Daiso VN (ベトナム)")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("検索"), { target: { value: "zzz" } });
    await waitFor(() => expect(screen.getByText("該当なし")).toBeTruthy());
  });

  it("検索中は案内を表示し、完了後に件数を通知する", async () => {
    let resolveSearch: (value: { companies: (typeof daisoVn)[]; users: (typeof taro)[] }) => void =
      () => {};
    searchMock.mockReturnValue(new Promise((resolve) => (resolveSearch = resolve)));
    render(<Harness />);

    fireEvent.change(screen.getByPlaceholderText("検索"), { target: { value: "tar" } });
    expect(await screen.findByText("検索中")).toBeTruthy();

    resolveSearch({ companies: [], users: [taro] });
    await waitFor(() => expect(screen.getByText("1件見つかりました")).toBeTruthy());
    expect(screen.queryByText("検索中")).toBeNull();
  });

  it("情報を復元できない選択済みIDは生のIDでなく「利用不可」で表示する", () => {
    render(<Harness initial={{ userIds: ["ghost-id"], companyIds: ["ghost-company"] }} />);

    expect(screen.getAllByText("利用不可")).toHaveLength(2);
    expect(screen.queryByText("ghost-id")).toBeNull();
    expect(screen.queryByText("ghost-company")).toBeNull();
  });
});
