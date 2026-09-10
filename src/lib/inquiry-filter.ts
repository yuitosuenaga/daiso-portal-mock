import type { Inquiry } from "@/types/inquiry";
import type { InquiryAgingFilterValue } from "@/lib/inquiry-aging";
import { matchesInquiryAging } from "@/lib/inquiry-aging";
import { toReferenceDateKey } from "@/lib/reference-date";

const UNRESOLVED_STATUSES: Inquiry["status"][] = ["new", "in_progress"];

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
  /** trueのとき、未解決（new・in_progress）の問い合わせのみに絞り込む */
  unresolvedOnly: boolean;
  /** 受付からの滞留時間で絞り込む。空文字は絞り込みなし */
  aging: "" | InquiryAgingFilterValue;
  /** 受付日（日本時間基準のYYYY-MM-DD）で絞り込む。空文字は絞り込みなし */
  receivedOn: string;
}

export const EMPTY_INQUIRY_FILTERS: InquiryFilters = {
  keyword: "",
  status: "",
  category: "",
  urgency: "",
  unreadOnly: false,
  unresolvedOnly: false,
  aging: "",
  receivedOn: "",
};

/**
 * タイトル・自由記述（部分一致・大文字小文字を区別しない）・対応状況・案件種別・緊急度・
 * 未確認（新着）・未解決・滞留時間・受付日のAND条件で問い合わせを絞り込む。
 * 引数の配列の順序は変更しない。
 * `unreadOnly`はstatusを問わず「未確認の新着」（`unreadInquiryIds`に含まれる）で判定するため、
 * 呼び出し元が保持する新着ID集合を渡す必要がある。
 * `aging`は、ダッシュボードのKPI集計とクリック後の一覧件数を一致させるため、
 * 集計側（`src/lib/inquiry-aging.ts`）と同じ`matchesInquiryAging`関数で判定する。
 */
export function filterInquiries(
  inquiries: Inquiry[],
  filters: InquiryFilters,
  context?: { unreadInquiryIds?: ReadonlySet<string>; referenceDate?: Date }
): Inquiry[] {
  const keyword = filters.keyword.trim().toLowerCase();
  const unreadInquiryIds = context?.unreadInquiryIds;
  const referenceDate = context?.referenceDate ?? new Date();

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
    if (filters.unresolvedOnly && !UNRESOLVED_STATUSES.includes(inquiry.status)) {
      return false;
    }
    if (filters.aging && !matchesInquiryAging(inquiry.createdAt, referenceDate, filters.aging)) {
      return false;
    }
    if (
      filters.receivedOn &&
      toReferenceDateKey(new Date(inquiry.createdAt)) !== filters.receivedOn
    ) {
      return false;
    }
    return true;
  });
}
