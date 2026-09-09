import type { Inquiry } from "@/types/inquiry";

/**
 * 申請者側問い合わせ一覧の検索・絞り込み条件。
 * 各フィールドが空文字列のときは当該条件による絞り込みを行わない。
 */
export interface InquiryFilters {
  keyword: string;
  status: "" | Inquiry["status"];
  category: "" | Inquiry["category"];
  urgency: "" | Inquiry["urgency"];
  /** trueのとき、ヘルプデスク起点の更新が未確認（新着）の問い合わせのみに絞り込む */
  unreadOnly: boolean;
}

export const EMPTY_INQUIRY_FILTERS: InquiryFilters = {
  keyword: "",
  status: "",
  category: "",
  urgency: "",
  unreadOnly: false,
};

/**
 * タイトル・自由記述（部分一致・大文字小文字を区別しない）・対応状況・案件種別・緊急度・
 * 未確認（新着）のAND条件で問い合わせを絞り込む。引数の配列の順序は変更しない。
 * `unreadOnly`はstatusを問わず「未確認の新着」（`unreadInquiryIds`に含まれる）で判定するため、
 * 呼び出し元が保持する新着ID集合を渡す必要がある。
 */
export function filterInquiries(
  inquiries: Inquiry[],
  filters: InquiryFilters,
  context?: { unreadInquiryIds?: ReadonlySet<string> }
): Inquiry[] {
  const keyword = filters.keyword.trim().toLowerCase();
  const unreadInquiryIds = context?.unreadInquiryIds;

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
    if (filters.urgency && inquiry.urgency !== filters.urgency) {
      return false;
    }
    if (filters.unreadOnly && !unreadInquiryIds?.has(inquiry.id)) {
      return false;
    }
    return true;
  });
}
