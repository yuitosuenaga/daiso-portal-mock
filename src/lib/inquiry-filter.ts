import type { Inquiry } from "@/types/inquiry";

/**
 * 申請者側問い合わせ一覧の検索・絞り込み条件。
 * 各フィールドが空文字列のときは当該条件による絞り込みを行わない。
 */
export interface InquiryFilters {
  keyword: string;
  status: "" | Inquiry["status"];
  category: "" | Inquiry["category"];
}

export const EMPTY_INQUIRY_FILTERS: InquiryFilters = {
  keyword: "",
  status: "",
  category: "",
};

/**
 * タイトル・自由記述（部分一致・大文字小文字を区別しない）・対応状況・案件種別の
 * AND条件で問い合わせを絞り込む。引数の配列の順序は変更しない。
 */
export function filterInquiries(
  inquiries: Inquiry[],
  filters: InquiryFilters
): Inquiry[] {
  const keyword = filters.keyword.trim().toLowerCase();

  return inquiries.filter((inquiry) => {
    if (
      keyword &&
      !inquiry.title.toLowerCase().includes(keyword) &&
      !inquiry.originalText.toLowerCase().includes(keyword)
    ) {
      return false;
    }
    if (filters.status && inquiry.status !== filters.status) {
      return false;
    }
    if (filters.category && inquiry.category !== filters.category) {
      return false;
    }
    return true;
  });
}
