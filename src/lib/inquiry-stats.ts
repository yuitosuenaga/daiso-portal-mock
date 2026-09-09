import type { Inquiry } from "@/types/inquiry";
import type { HelpdeskInquiryStatusBreakdown } from "@/lib/helpdesk-inquiry-stats";

const UNRESOLVED_STATUSES: Inquiry["status"][] = ["new", "in_progress"];
const URGENCY_ORDER: Inquiry["urgency"][] = ["high", "medium", "low"];

export interface ApplicantInquiryStats {
  /** 集計対象（呼び出し元でフィルタ適用後の配列を渡す想定）の総件数 */
  total: number;
  byStatus: HelpdeskInquiryStatusBreakdown;
  /** new + in_progress */
  unresolved: number;
  /** ヘルプデスク起点の更新が未確認（新着）の件数。statusは問わない */
  unread: number;
  /** 未解決（new・in_progress）かつヘルプデスクからまだ返信・対応開始されていない件数 */
  awaitingResponse: number;
  /** 未解決のうちurgencyが"high"の件数 */
  highUrgencyUnresolved: number;
  /** 未解決を緊急度別に集計したもの（high/medium/lowの3キー） */
  byUrgencyUnresolved: Record<Inquiry["urgency"], number>;
}

/**
 * 申請者側問い合わせ一覧の右側パネル（対応状況サマリ）向けに、
 * 渡された配列（フィルタ適用済みの想定）から表示に必要な集計値をまとめて算出する。
 *
 * `unreadInquiryIds`は、ヘルプデスク起点の更新をまだ確認していない問い合わせのID集合
 * （`getUnreadReplyInquiryIds`の結果）。
 */
export function computeApplicantInquiryStats(
  inquiries: Inquiry[],
  options: { unreadInquiryIds: ReadonlySet<string> }
): ApplicantInquiryStats {
  const { unreadInquiryIds } = options;

  const byStatus: HelpdeskInquiryStatusBreakdown = {
    new: 0,
    in_progress: 0,
    resolved: 0,
  };

  let unread = 0;
  let highUrgencyUnresolved = 0;
  const byUrgencyUnresolved: Record<Inquiry["urgency"], number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const inquiry of inquiries) {
    byStatus[inquiry.status] += 1;

    if (unreadInquiryIds.has(inquiry.id)) {
      unread += 1;
    }

    if (UNRESOLVED_STATUSES.includes(inquiry.status)) {
      byUrgencyUnresolved[inquiry.urgency] += 1;
      if (inquiry.urgency === "high") {
        highUrgencyUnresolved += 1;
      }
    }
  }

  const unresolved = byStatus.new + byStatus.in_progress;

  return {
    total: inquiries.length,
    byStatus,
    unresolved,
    unread,
    awaitingResponse: byStatus.new,
    highUrgencyUnresolved,
    byUrgencyUnresolved,
  };
}

export interface UrgencyRow {
  urgency: Inquiry["urgency"];
  count: number;
  /** 3行（high/medium/low）のcount最大値を100%とした幅（%） */
  barPercent: number;
}

/**
 * 未解決の緊急度別件数を横棒リスト描画用の行データに変換する。
 * high/medium/lowを常に3行固定で返す（0件でも「0件である」こと自体が意味のある情報のため）。
 */
export function toUrgencyRows(stats: ApplicantInquiryStats): UrgencyRow[] {
  const maxCount = Math.max(1, ...URGENCY_ORDER.map((u) => stats.byUrgencyUnresolved[u]));

  return URGENCY_ORDER.map((urgency) => ({
    urgency,
    count: stats.byUrgencyUnresolved[urgency],
    barPercent: (stats.byUrgencyUnresolved[urgency] / maxCount) * 100,
  }));
}
