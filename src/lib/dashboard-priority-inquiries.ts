import type { Inquiry } from "@/types/inquiry";

const URGENCY_PRIORITY: Record<Inquiry["urgency"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * 問い合わせが未着手（誰も対応着手していない）かどうかを判定する。
 * `claim` が未設定または `null` の場合に未着手とみなす。
 */
function isUnclaimed(inquiry: Inquiry): boolean {
  return inquiry.claim == null;
}

/**
 * ダッシュボードの「対応が必要な申請」プレビューパネル専用の並び替えロジック。
 * (1) 未着手（誰も対応着手していない）ものを優先し、(2) 緊急度（高→中→低）、
 * (3) 受付日時（createdAt）の降順、の順で並び替える。
 * 既存の一覧ページが使用する `sortInquiriesForHelpdesk`（`src/lib/helpdesk-inquiry-list.ts`）
 * とは独立した関数であり、引数の配列は変更しない。
 */
export function sortInquiriesForPriorityPreview(inquiries: Inquiry[]): Inquiry[] {
  return [...inquiries].sort((a, b) => {
    const unclaimedDiff = Number(isUnclaimed(b)) - Number(isUnclaimed(a));
    if (unclaimedDiff !== 0) {
      return unclaimedDiff;
    }

    const urgencyDiff = URGENCY_PRIORITY[a.urgency] - URGENCY_PRIORITY[b.urgency];
    if (urgencyDiff !== 0) {
      return urgencyDiff;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
