import type { Inquiry } from "@/types/inquiry";
import { toReferenceDateKey } from "@/lib/reference-date";

const UNRESOLVED_STATUSES: Inquiry["status"][] = ["new", "in_progress"];

export interface UnresolvedInquiriesKpi {
  /** 全社の未対応（新規・対応中）件数 */
  total: number;
  /** 未対応のうち、受付日時（createdAt）が当日（日本時間基準）のもの */
  today: number;
}

/**
 * ヘルプデスク側ダッシュボードのKPI強調表示用に、全社の問い合わせから
 * 未対応（`status`が`new`または`in_progress`）件数と、そのうち受付日時
 * （`createdAt`）がビュー表示日の当日（日本時間基準）である件数を算出する。
 *
 * `referenceDate`は「当日」の基準となる日時。既定値は呼び出し時点の現在時刻。
 */
export function computeUnresolvedInquiriesKpi(
  inquiries: Inquiry[],
  referenceDate: Date = new Date()
): UnresolvedInquiriesKpi {
  const unresolved = inquiries.filter((inquiry) =>
    UNRESOLVED_STATUSES.includes(inquiry.status)
  );

  const todayKey = toReferenceDateKey(referenceDate);
  const today = unresolved.filter(
    (inquiry) => toReferenceDateKey(new Date(inquiry.createdAt)) === todayKey
  ).length;

  return { total: unresolved.length, today };
}
