/**
 * カテゴリ×年月の検索フィルタ共通基盤。売場検討会/POP・マニュアルの新規画面など、
 * 複数画面から共通利用する定数・型を一元管理する。
 */

/** カテゴリ・年・月セレクトの「すべて」を表す番兵値。 */
export const CATEGORY_YEAR_MONTH_FILTER_ALL = "all";

export type CategoryYearMonthFilters = {
  keyword: string;
  category: string;
  year: string;
  month: string;
};

/** フィルタの初期状態。キーワードは空、カテゴリ/年/月はすべて「すべて」。 */
export const INITIAL_CATEGORY_YEAR_MONTH_FILTERS: CategoryYearMonthFilters = {
  keyword: "",
  category: CATEGORY_YEAR_MONTH_FILTER_ALL,
  year: CATEGORY_YEAR_MONTH_FILTER_ALL,
  month: CATEGORY_YEAR_MONTH_FILTER_ALL,
};
