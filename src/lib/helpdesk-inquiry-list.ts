import type { Inquiry } from "@/types/inquiry";

const URGENCY_PRIORITY: Record<Inquiry["urgency"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * 対応状況のソート優先度（新規→対応中→解決済みの順）。
 * 未対応の案件が緊急度の高い解決済み案件などに埋もれないよう、最優先の基準とする。
 */
const STATUS_SORT_PRIORITY: Record<Inquiry["status"], number> = {
  new: 0,
  in_progress: 1,
  resolved: 2,
};

/**
 * 対応状況（新規→対応中→解決済み）を最優先の基準とし、次に緊急度（高→中→低）、
 * 同一条件内は受付日時（createdAt）の昇順（古いものを優先表示）で並び替える。
 * 引数の配列は変更しない。
 */
export function sortInquiriesForHelpdesk(inquiries: Inquiry[]): Inquiry[] {
  return [...inquiries].sort((a, b) => {
    const statusDiff =
      STATUS_SORT_PRIORITY[a.status] - STATUS_SORT_PRIORITY[b.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    const urgencyDiff = URGENCY_PRIORITY[a.urgency] - URGENCY_PRIORITY[b.urgency];
    if (urgencyDiff !== 0) {
      return urgencyDiff;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
  status: "" | Inquiry["status"];
  urgency: "" | Inquiry["urgency"];
  /** trueのとき、誰も対応着手していない（claimがない）未対応件のみに絞り込む */
  unclaimedOnly: boolean;
  /** 対応中フラグ（claim）の対応者名で絞り込む。空文字は絞り込みなし */
  claimedBy: string;
}

export const EMPTY_HELPDESK_INQUIRY_FILTERS: HelpdeskInquiryFilters = {
  companyName: "",
  keyword: "",
  country: "",
  category: "",
  status: "",
  urgency: "",
  unclaimedOnly: false,
  claimedBy: "",
};

/**
 * 会社名・キーワード・国・カテゴリ・対応状況・緊急度・未着手・対応者のAND条件で問い合わせを絞り込む。
 * 会社名・キーワードは大文字小文字を区別しない部分一致とする。
 * キーワードはタイトル（title）・自由記述本文（originalText）のいずれかに
 * 部分一致すれば対象とする。
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
    if (
      keyword &&
      !inquiry.title.toLowerCase().includes(keyword) &&
      !inquiry.originalText.toLowerCase().includes(keyword)
    ) {
      return false;
    }
    if (filters.country && inquiry.submittedBy.country !== filters.country) {
      return false;
    }
    if (filters.category && inquiry.category !== filters.category) {
      return false;
    }
    if (filters.status && inquiry.status !== filters.status) {
      return false;
    }
    if (filters.urgency && inquiry.urgency !== filters.urgency) {
      return false;
    }
    if (filters.unclaimedOnly && inquiry.claim != null) {
      return false;
    }
    if (filters.claimedBy && inquiry.claim?.staffName !== filters.claimedBy) {
      return false;
    }
    return true;
  });
}
