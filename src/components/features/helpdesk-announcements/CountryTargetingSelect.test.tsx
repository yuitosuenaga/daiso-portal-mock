import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CountryTargetingSelect } from "@/components/features/helpdesk-announcements/CountryTargetingSelect";

const options = [
  { value: "JP", label: "日本" },
  { value: "US", label: "アメリカ合衆国" },
  { value: "VN", label: "ベトナム" },
];

const labels = {
  id: "announcement-targeting-countries",
  searchPlaceholder: "国名で検索",
  selectAllButtonLabel: "すべて選択",
  clearAllButtonLabel: "選択をすべて解除",
  selectedCountLabel: "{count}件選択中",
  noResultsMessage: "該当する国・地域がありません",
  removeChipButtonLabel: "削除",
  groupLabel: "国・地域（複数選択可）",
};

describe("CountryTargetingSelect", () => {
  it("候補一覧をチェックボックスで表示し、未選択状態では選択件数0件と表示する", () => {
    render(
      <CountryTargetingSelect options={options} value={[]} onChange={vi.fn()} {...labels} />
    );

    expect(screen.getByRole("checkbox", { name: "日本" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "アメリカ合衆国" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "ベトナム" })).toBeTruthy();
    expect(screen.getByText("0件選択中")).toBeTruthy();
  });

  it("チェックボックスをクリックするとonChangeへ追加後の国コード配列が渡される", () => {
    const onChange = vi.fn();
    render(
      <CountryTargetingSelect options={options} value={["JP"]} onChange={onChange} {...labels} />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "ベトナム" }));

    expect(onChange).toHaveBeenCalledWith(["JP", "VN"]);
  });

  it("選択済みの国のチェックボックスをクリックすると選択解除される", () => {
    const onChange = vi.fn();
    render(
      <CountryTargetingSelect
        options={options}
        value={["JP", "VN"]}
        onChange={onChange}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "日本" }));

    expect(onChange).toHaveBeenCalledWith(["VN"]);
  });

  it("検索語を入力すると一致しない候補が非表示になり、選択済みチップと選択件数は維持される", () => {
    render(
      <CountryTargetingSelect
        options={options}
        value={["JP", "VN"]}
        onChange={vi.fn()}
        {...labels}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("国名で検索"), {
      target: { value: "ベトナム" },
    });

    expect(screen.queryByRole("checkbox", { name: "日本" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "ベトナム" })).toBeTruthy();
    expect(screen.getByText("2件選択中")).toBeTruthy();
  });

  it("検索語に一致する候補が0件のとき、該当なしメッセージを表示する", () => {
    render(
      <CountryTargetingSelect options={options} value={[]} onChange={vi.fn()} {...labels} />
    );

    fireEvent.change(screen.getByPlaceholderText("国名で検索"), {
      target: { value: "存在しない国名" },
    });

    expect(screen.getByText("該当する国・地域がありません")).toBeTruthy();
  });

  it("すべて選択ボタンで表示中の候補全件がonChangeへ渡される", () => {
    const onChange = vi.fn();
    render(
      <CountryTargetingSelect options={options} value={[]} onChange={onChange} {...labels} />
    );

    fireEvent.click(screen.getByRole("button", { name: "すべて選択" }));

    expect(onChange).toHaveBeenCalledWith(["JP", "US", "VN"]);
  });

  it("すべて選択ボタンは検索で絞り込んだ候補のみを対象とし、既存の選択には影響しない", () => {
    const onChange = vi.fn();
    render(
      <CountryTargetingSelect
        options={options}
        value={["US"]}
        onChange={onChange}
        {...labels}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("国名で検索"), {
      target: { value: "ベ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "すべて選択" }));

    expect(onChange).toHaveBeenCalledWith(["US", "VN"]);
  });

  it("選択をすべて解除ボタンで選択済みの国・地域が空配列になる", () => {
    const onChange = vi.fn();
    render(
      <CountryTargetingSelect
        options={options}
        value={["JP", "VN"]}
        onChange={onChange}
        {...labels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "選択をすべて解除" }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("選択済みの国はチップとして表示され、チップの削除ボタンから選択解除できる", () => {
    const onChange = vi.fn();
    render(
      <CountryTargetingSelect
        options={options}
        value={["JP", "VN"]}
        onChange={onChange}
        {...labels}
      />
    );

    expect(
      screen.getByRole("button", { name: "削除: 日本" })
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "削除: 日本" }));

    expect(onChange).toHaveBeenCalledWith(["VN"]);
  });

  it("ariaInvalidがtrueのとき候補グループにエラー状態を示すdata属性が反映される", () => {
    render(
      <CountryTargetingSelect
        options={options}
        value={[]}
        onChange={vi.fn()}
        ariaInvalid
        {...labels}
      />
    );

    expect(
      screen.getByRole("group", { name: "国・地域（複数選択可）" }).getAttribute(
        "data-invalid"
      )
    ).toBe("true");
  });
});
