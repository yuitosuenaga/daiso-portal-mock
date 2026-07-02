import type { Inquiry } from "@/types/inquiry";

const URGENCY_PRIORITY: Record<Inquiry["urgency"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * 緊急度（高→中→低）を最優先の基準とし、同一緊急度内は受付日時（createdAt）の
 * 降順で並び替える。引数の配列は変更しない。
 */
export function sortInquiriesForHelpdesk(inquiries: Inquiry[]): Inquiry[] {
  return [...inquiries].sort((a, b) => {
    const urgencyDiff = URGENCY_PRIORITY[a.urgency] - URGENCY_PRIORITY[b.urgency];
    if (urgencyDiff !== 0) {
      return urgencyDiff;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * ヘルプデスク側一覧の検索・横断フィルタ条件。
 * 各フィールドが空文字列のときは当該条件による絞り込みを行わない。
 */
export interface HelpdeskInquiryFilters {
  companyName: string;
  keyword: string;
  country: string;
  category: string;
}

export const EMPTY_HELPDESK_INQUIRY_FILTERS: HelpdeskInquiryFilters = {
  companyName: "",
  keyword: "",
  country: "",
  category: "",
};

/**
 * 会社名・キーワード・国・カテゴリのAND条件で問い合わせを絞り込む。
 * 会社名・キーワードは大文字小文字を区別しない部分一致とする。
 */
export function filterInquiriesForHelpdesk(
  inquiries: Inquiry[],
  filters: HelpdeskInquiryFilters
): Inquiry[] {
  const companyName = filters.companyName.trim().toLowerCase();
  const keyword = filters.keyword.trim().toLowerCase();

  return inquiries.filter((inquiry) => {
    if (
      companyName &&
      !inquiry.submittedBy.companyName.toLowerCase().includes(companyName)
    ) {
      return false;
    }
    if (keyword && !inquiry.originalText.toLowerCase().includes(keyword)) {
      return false;
    }
    if (filters.country && inquiry.submittedBy.country !== filters.country) {
      return false;
    }
    if (filters.category && inquiry.category !== filters.category) {
      return false;
    }
    return true;
  });
}
