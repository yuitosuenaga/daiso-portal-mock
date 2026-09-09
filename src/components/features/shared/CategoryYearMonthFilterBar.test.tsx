import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CategoryYearMonthFilterBar } from "@/components/features/shared/CategoryYearMonthFilterBar";
import {
  CATEGORY_YEAR_MONTH_FILTER_ALL,
  INITIAL_CATEGORY_YEAR_MONTH_FILTERS,
  type CategoryYearMonthFilters,
} from "@/lib/constants/category-year-month-filter";

const categoryOptions = [
  { value: "pop", label: "POP" },
  { value: "sales-floor", label: "売場検討会" },
];
const yearOptions = [
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
];
const monthOptions = [
  { value: "1", label: "1月" },
  { value: "2", label: "2月" },
];

const labels = {
  keywordLabel: "キーワード",
  keywordPlaceholder: "キーワードを入力",
  categoryLabel: "カテゴリ",
  categoryAll: "すべて",
  yearLabel: "年",
  yearAll: "すべて",
  monthLabel: "月",
  monthAll: "すべて",
  clearButton: "条件をクリア",
};

function renderFilterBar(
  overrides: Partial<{
    filters: CategoryYearMonthFilters;
    onChange: (filters: CategoryYearMonthFilters) => void;
    onClear: () => void;
    showKeyword: boolean;
  }> = {}
) {
  const onChange = overrides.onChange ?? vi.fn();
  const onClear = overrides.onClear ?? vi.fn();
  const filters = overrides.filters ?? INITIAL_CATEGORY_YEAR_MONTH_FILTERS;

  render(
    <CategoryYearMonthFilterBar
      filters={filters}
      onChange={onChange}
      onClear={onClear}
      categoryOptions={categoryOptions}
      yearOptions={yearOptions}
      monthOptions={monthOptions}
      labels={labels}
      showKeyword={overrides.showKeyword}
    />
  );

  return { onChange, onClear };
}

describe("CategoryYearMonthFilterBar", () => {
  it("showKeywordを指定しない場合、キーワード入力欄が描画されない", () => {
    renderFilterBar();

    expect(screen.queryByLabelText("キーワード")).toBeNull();
  });

  it("showKeywordがfalseの場合、キーワード入力欄が描画されない", () => {
    renderFilterBar({ showKeyword: false });

    expect(screen.queryByLabelText("キーワード")).toBeNull();
  });

  it("showKeywordがtrueの場合、キーワード入力欄が描画される", () => {
    renderFilterBar({ showKeyword: true });

    expect(screen.getByLabelText("キーワード")).toBeTruthy();
  });

  it("キーワード入力を変更するとonChangeが正しい引数で呼ばれる", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilterBar({ showKeyword: true });

    await user.type(screen.getByLabelText("キーワード"), "a");

    expect(onChange).toHaveBeenCalledWith({
      ...INITIAL_CATEGORY_YEAR_MONTH_FILTERS,
      keyword: "a",
    });
  });

  it("カテゴリセレクトを変更するとonChangeが正しい引数で呼ばれる", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilterBar();

    await user.selectOptions(screen.getByLabelText("カテゴリ"), "pop");

    expect(onChange).toHaveBeenCalledWith({
      ...INITIAL_CATEGORY_YEAR_MONTH_FILTERS,
      category: "pop",
    });
  });

  it("年セレクトを変更するとonChangeが正しい引数で呼ばれる", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilterBar();

    await user.selectOptions(screen.getByLabelText("年"), "2026");

    expect(onChange).toHaveBeenCalledWith({
      ...INITIAL_CATEGORY_YEAR_MONTH_FILTERS,
      year: "2026",
    });
  });

  it("月セレクトを変更するとonChangeが正しい引数で呼ばれる", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilterBar();

    await user.selectOptions(screen.getByLabelText("月"), "2");

    expect(onChange).toHaveBeenCalledWith({
      ...INITIAL_CATEGORY_YEAR_MONTH_FILTERS,
      month: "2",
    });
  });

  it("既存の他フィルタ値を保持したままonChangeを呼ぶ", async () => {
    const user = userEvent.setup();
    const filters: CategoryYearMonthFilters = {
      keyword: "テスト",
      category: "pop",
      year: CATEGORY_YEAR_MONTH_FILTER_ALL,
      month: CATEGORY_YEAR_MONTH_FILTER_ALL,
    };
    const { onChange } = renderFilterBar({ filters, showKeyword: true });

    await user.selectOptions(screen.getByLabelText("月"), "1");

    expect(onChange).toHaveBeenCalledWith({
      ...filters,
      month: "1",
    });
  });

  it("クリアボタンをクリックするとonClearが呼ばれる", async () => {
    const user = userEvent.setup();
    const { onClear } = renderFilterBar();

    await user.click(screen.getByRole("button", { name: "条件をクリア" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("カテゴリ・年・月それぞれのLabelが対応するフォーム要素と関連付けられている", () => {
    renderFilterBar({ showKeyword: true });

    expect(screen.getByLabelText("カテゴリ").tagName).toBe("SELECT");
    expect(screen.getByLabelText("年").tagName).toBe("SELECT");
    expect(screen.getByLabelText("月").tagName).toBe("SELECT");
    expect(screen.getByLabelText("キーワード").tagName).toBe("INPUT");
  });

  it("カテゴリセレクトの先頭にlabels.categoryAllを含む「すべて」オプションが追加される", () => {
    renderFilterBar();

    const select = screen.getByLabelText("カテゴリ") as HTMLSelectElement;
    expect(select.options[0].value).toBe(CATEGORY_YEAR_MONTH_FILTER_ALL);
    expect(select.options[0].textContent).toBe("すべて");
  });
});
