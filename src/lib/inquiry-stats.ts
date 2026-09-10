import type { Inquiry } from "@/types/inquiry";
import type { HelpdeskInquiryStatusBreakdown } from "@/lib/helpdesk-inquiry-stats";
import {
  elapsedHoursSince,
  STALE_AWAITING_RESPONSE_THRESHOLD_HOURS,
} from "@/lib/inquiry-aging";
import type { InquiryAgingBucket } from "@/lib/inquiry-aging";
import { countByCategory, countUnresolvedAging, findOldestUnresolvedHours } from "@/lib/inquiry-breakdown";
import { computeDailyIntake } from "@/lib/inquiry-intake-trend";
import type { DailyIntakePoint } from "@/lib/inquiry-intake-trend";
import { toReferenceDateKey } from "@/lib/reference-date";

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
  /** 案件種別別の件数（母集団は渡された配列全件） */
  byCategory: Record<Inquiry["category"], number>;
  /** 未解決のみを母集団とした滞留時間バケット別件数 */
  unresolvedAging: Record<InquiryAgingBucket, number>;
  /** 未解決のうち最古の経過時間（時間）。未解決0件ならnull */
  oldestUnresolvedHours: number | null;
  /** status="new"（回答待ち）のまま72時間以上経過している件数 */
  staleAwaitingResponse: number;
  /** 直近7日（JST、referenceDate当日を最終日）の送信件数 */
  dailyIntake: DailyIntakePoint[];
  /** referenceDate当日（JST）の送信件数。statusは問わない */
  todayCount: number;
}

/**
 * 申請者側問い合わせ一覧の右側パネル（対応状況サマリ）向けに、
 * 渡された配列（フィルタ適用済みの想定）から表示に必要な集計値をまとめて算出する。
 *
 * `unreadInquiryIds`は、ヘルプデスク起点の更新をまだ確認していない問い合わせのID集合
 * （`getUnreadReplyInquiryIds`の結果）。
 * `referenceDate`は「当日」「滞留時間」の基準時刻（既定は呼び出し時点の現在時刻）。
 * サーバーとクライアントで基準時刻がずれるとハイドレーション不一致になるため、
 * ダッシュボード/一覧の呼び出し元はサーバーが決めた同一の時刻を渡すこと。
 */
export function computeApplicantInquiryStats(
  inquiries: Inquiry[],
  options: { unreadInquiryIds: ReadonlySet<string>; referenceDate?: Date }
): ApplicantInquiryStats {
  const { unreadInquiryIds } = options;
  const referenceDate = options.referenceDate ?? new Date();

  const byStatus: HelpdeskInquiryStatusBreakdown = {
    new: 0,
    in_progress: 0,
    resolved: 0,
  };

  let unread = 0;
  let highUrgencyUnresolved = 0;
  let staleAwaitingResponse = 0;
  let todayCount = 0;
  const todayKey = toReferenceDateKey(referenceDate);
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

    if (toReferenceDateKey(new Date(inquiry.createdAt)) === todayKey) {
      todayCount += 1;
    }

    if (
      inquiry.status === "new" &&
      elapsedHoursSince(inquiry.createdAt, referenceDate) >= STALE_AWAITING_RESPONSE_THRESHOLD_HOURS
    ) {
      staleAwaitingResponse += 1;
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
    byCategory: countByCategory(inquiries),
    unresolvedAging: countUnresolvedAging(inquiries, referenceDate),
    oldestUnresolvedHours: findOldestUnresolvedHours(inquiries, referenceDate),
    staleAwaitingResponse,
    dailyIntake: computeDailyIntake(inquiries, referenceDate),
    todayCount,
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
