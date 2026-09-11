import type { Inquiry } from "@/types/inquiry";
import { toReferenceDateKey } from "@/lib/reference-date";
import { elapsedHoursSince, STALE_UNCLAIMED_THRESHOLD_HOURS } from "@/lib/inquiry-aging";
import type { InquiryAgingBucket } from "@/lib/inquiry-aging";
import { countByCategory, countUnresolvedAging, countUnresolvedByCountry } from "@/lib/inquiry-breakdown";
import { computeDailyIntake } from "@/lib/inquiry-intake-trend";
import type { DailyIntakePoint } from "@/lib/inquiry-intake-trend";

const UNRESOLVED_STATUSES: Inquiry["status"][] = ["new", "in_progress"];

export interface HelpdeskInquiryStatusBreakdown {
  new: number;
  in_progress: number;
  resolved: number;
}

export interface HelpdeskInquiryStaffLoad {
  staffName: string;
  count: number;
}

export interface HelpdeskInquiryStats {
  /** 集計対象（呼び出し元でフィルタ適用後の配列を渡す想定）の総件数 */
  total: number;
  byStatus: HelpdeskInquiryStatusBreakdown;
  /** new + in_progress */
  unresolved: number;
  /**
   * 未対応（new・in_progress）かつ`claim`が`null`の件数。
   * resolvedは対象母集団に含めない（解決済みで対応中フラグが無いのは「未着手」ではないため）。
   */
  unclaimed: number;
  /** unclaimedのうちurgencyが"high"の件数 */
  unclaimedHighUrgency: number;
  /**
   * 未対応（new・in_progress）かつ`claim`が設定済みの件数を`staffName`で集計したもの。
   * count降順、同数はstaffName昇順。
   */
  claimedByStaff: HelpdeskInquiryStaffLoad[];
  /** claimedByStaffの件数合計。unclaimed + claimedTotal === unresolved が常に成立する */
  claimedTotal: number;
  /** createdAtが当日（日本時間基準）の件数。statusを問わない受付件数 */
  todayCount: number;
  /** todayCountのうちstatusがnew・in_progress（未対応）のもの */
  todayUnresolved: number;
  /** 案件種別別の件数（母集団は渡された配列全件） */
  byCategory: Record<Inquiry["category"], number>;
  /** 未解決のみを母集団とした国別件数。count降順→country昇順 */
  byCountry: { country: string; count: number }[];
  /** 未解決のみを母集団とした滞留時間バケット別件数 */
  unresolvedAging: Record<InquiryAgingBucket, number>;
  /** 未着手（未対応かつclaim無し）かつ受付から24時間超の件数 */
  staleUnclaimed: number;
  /** 未着手のうち最古の経過時間（時間）。未着手0件ならnull */
  oldestUnclaimedHours: number | null;
  /**
   * `options.currentStaffName`と一致する`claim.staffName`を持つ未解決件数。
   * `HelpdeskStaff.displayName`に一意制約が無いため、既存の`claimedBy`フィルタと同じ
   * 表示名の文字列一致で判定する（IDベースにするとフィルタ結果とKPI数値がずれるため）。
   * `currentStaffName`未指定時は0。
   */
  mine: number;
  /** 直近7日（JST、referenceDate当日を最終日）の受付件数 */
  dailyIntake: DailyIntakePoint[];
}

/**
 * 問い合わせが未着手（誰も対応着手していない）かどうかを判定する。
 * `claim`が未設定または`null`の場合に未着手とみなす。
 * `src/lib/dashboard-priority-inquiries.ts`の同名ロジックと判定基準は同一だが、
 * 依存関係を増やさないためここでは独立して定義する。
 */
function isUnclaimed(inquiry: Inquiry): boolean {
  return inquiry.claim == null;
}

/**
 * ヘルプデスク側問い合わせ一覧の右側パネル（対応状況サマリ）向けに、
 * 渡された配列（フィルタ適用済みの想定）から表示に必要な集計値をまとめて算出する。
 *
 * `referenceDate`は「当日」「滞留時間」の基準となる日時。既定値は呼び出し時点の現在時刻。
 * サーバーとクライアントで基準時刻がずれるとハイドレーション不一致になるため、
 * ダッシュボード/一覧の呼び出し元はサーバーが決めた同一の時刻を渡すこと。
 * `currentStaffName`はログイン中スタッフの表示名（`mine`集計に使用）。
 */
export function computeHelpdeskInquiryStats(
  inquiries: Inquiry[],
  options?: { referenceDate?: Date; currentStaffName?: string }
): HelpdeskInquiryStats {
  const referenceDate = options?.referenceDate ?? new Date();
  const currentStaffName = options?.currentStaffName;
  const todayKey = toReferenceDateKey(referenceDate);

  const byStatus: HelpdeskInquiryStatusBreakdown = {
    new: 0,
    in_progress: 0,
    resolved: 0,
  };

  let unclaimed = 0;
  let unclaimedHighUrgency = 0;
  let staleUnclaimed = 0;
  let oldestUnclaimedCreatedAtMs: number | null = null;
  let todayCount = 0;
  let todayUnresolved = 0;
  let mine = 0;
  const staffCounts = new Map<string, number>();

  for (const inquiry of inquiries) {
    byStatus[inquiry.status] += 1;

    const isToday = toReferenceDateKey(new Date(inquiry.createdAt)) === todayKey;
    if (isToday) {
      todayCount += 1;
    }

    if (!UNRESOLVED_STATUSES.includes(inquiry.status)) {
      continue;
    }

    if (isToday) {
      todayUnresolved += 1;
    }

    if (currentStaffName != null && inquiry.claim?.staffName === currentStaffName) {
      mine += 1;
    }

    if (isUnclaimed(inquiry)) {
      unclaimed += 1;
      if (inquiry.urgency === "high") {
        unclaimedHighUrgency += 1;
      }
      if (elapsedHoursSince(inquiry.createdAt, referenceDate) >= STALE_UNCLAIMED_THRESHOLD_HOURS) {
        staleUnclaimed += 1;
      }
      const createdAtMs = new Date(inquiry.createdAt).getTime();
      if (oldestUnclaimedCreatedAtMs === null || createdAtMs < oldestUnclaimedCreatedAtMs) {
        oldestUnclaimedCreatedAtMs = createdAtMs;
      }
    } else {
      const staffName = inquiry.claim!.staffName;
      staffCounts.set(staffName, (staffCounts.get(staffName) ?? 0) + 1);
    }
  }

  const claimedByStaff = Array.from(
    staffCounts,
    ([staffName, count]): HelpdeskInquiryStaffLoad => ({ staffName, count })
  ).sort((a, b) => b.count - a.count || a.staffName.localeCompare(b.staffName));

  const claimedTotal = claimedByStaff.reduce((sum, row) => sum + row.count, 0);
  const unresolved = byStatus.new + byStatus.in_progress;
  const oldestUnclaimedHours =
    oldestUnclaimedCreatedAtMs === null
      ? null
      : Math.max(0, (referenceDate.getTime() - oldestUnclaimedCreatedAtMs) / 3_600_000);

  return {
    total: inquiries.length,
    byStatus,
    unresolved,
    unclaimed,
    unclaimedHighUrgency,
    claimedByStaff,
    claimedTotal,
    todayCount,
    todayUnresolved,
    byCategory: countByCategory(inquiries),
    byCountry: countUnresolvedByCountry(inquiries),
    unresolvedAging: countUnresolvedAging(inquiries, referenceDate),
    staleUnclaimed,
    oldestUnclaimedHours,
    mine,
    dailyIntake: computeDailyIntake(inquiries, referenceDate),
  };
}

export interface StatusSegment {
  status: Inquiry["status"];
  count: number;
  /** 整数パーセント。全セグメントの合計は必ず100になる（totalが0の場合を除く） */
  percent: number;
}

const STATUS_ORDER: Inquiry["status"][] = ["new", "in_progress", "resolved"];

/**
 * status別内訳を積み上げバー描画用のセグメント配列に変換する。
 * `count === 0`のstatusは結果から除外し、幅0のセグメントを描画しないようにする。
 * パーセントは最大剰余法（Largest Remainder Method）で丸め、合計が必ず100になるようにする
 * （単純な四捨五入だと33/33/33=99%のように合計が100に届かないケースが生じるため）。
 */
export function toStatusSegments(
  byStatus: HelpdeskInquiryStatusBreakdown,
  total: number
): StatusSegment[] {
  if (total === 0) {
    return [];
  }

  const entries = STATUS_ORDER.filter((status) => byStatus[status] > 0).map(
    (status) => {
      const exact = (byStatus[status] / total) * 100;
      return { status, count: byStatus[status], exact, percent: Math.floor(exact) };
    }
  );

  let remainder = 100 - entries.reduce((sum, entry) => sum + entry.percent, 0);
  const byRemainderDesc = [...entries].sort(
    (a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact))
  );
  for (const entry of byRemainderDesc) {
    if (remainder <= 0) {
      break;
    }
    entry.percent += 1;
    remainder -= 1;
  }

  return entries.map(({ status, count, percent }) => ({ status, count, percent }));
}

export interface StaffLoadRow {
  key: string;
  kind: "unclaimed" | "staff" | "others";
  /** "staff"の場合はstaffName。他のkindではi18n側でラベルを解決するためnull */
  label: string | null;
  count: number;
  /** kind==="others"の場合のみ設定。畳み込まれた担当者の人数（"ほかN名"のN） */
  staffCount?: number;
  /** 表示される全行のcountの最大値を100%とした共有スケール上の幅（%） */
  barPercent: number;
}

/**
 * 「未着手＋対応者別」の横棒リスト描画用に行データを組み立てる。
 * 先頭に未着手行（0件でも表示する。「未着手0件」自体が意味のある情報のため）、
 * 続いて対応中の担当者を件数降順で`maxStaffRows`件、残りは"others"として1行に畳む。
 * 対応中の担当者が1人もいない場合は`staff`/`others`行は生成されない
 * （呼び出し側で空状態表示に切り替える）。
 */
export function toStaffLoadRows(
  stats: HelpdeskInquiryStats,
  options?: { maxStaffRows?: number }
): StaffLoadRow[] {
  const maxStaffRows = options?.maxStaffRows ?? 6;

  const rows: StaffLoadRow[] = [
    { key: "unclaimed", kind: "unclaimed", label: null, count: stats.unclaimed, barPercent: 0 },
  ];

  const visibleStaff = stats.claimedByStaff.slice(0, maxStaffRows);
  const restStaff = stats.claimedByStaff.slice(maxStaffRows);

  for (const staff of visibleStaff) {
    rows.push({
      key: `staff:${staff.staffName}`,
      kind: "staff",
      label: staff.staffName,
      count: staff.count,
      barPercent: 0,
    });
  }

  if (restStaff.length > 0) {
    const othersCount = restStaff.reduce((sum, staff) => sum + staff.count, 0);
    rows.push({
      key: "others",
      kind: "others",
      label: null,
      count: othersCount,
      staffCount: restStaff.length,
      barPercent: 0,
    });
  }

  const maxCount = Math.max(1, ...rows.map((row) => row.count));

  return rows.map((row) => ({
    ...row,
    barPercent: (row.count / maxCount) * 100,
  }));
}
