/**
 * 問い合わせの「受付からの滞留時間」を表すバケット。グラフの内訳表示（相互排他）で使う。
 * 境界値は「以上」側に倒す（24時間ちょうどは h24to72 に入る等）。
 */
export const INQUIRY_AGING_BUCKETS = ["lt24h", "h24to72", "d3to7", "gte7d"] as const;

/**
 * 警告表示からのディープリンク用の累積しきい値プリセット（「N時間以上」）。
 * バケットと同じ `aging` フィールドで表現することで、フィルタ値を配列にせずに済む。
 */
export const INQUIRY_AGING_PRESETS = ["over24h", "over72h"] as const;

export const INQUIRY_AGING_FILTER_VALUES = [
  ...INQUIRY_AGING_BUCKETS,
  ...INQUIRY_AGING_PRESETS,
] as const;

export type InquiryAgingBucket = (typeof INQUIRY_AGING_BUCKETS)[number];
export type InquiryAgingFilterValue = (typeof INQUIRY_AGING_FILTER_VALUES)[number];

/** 未着手のまま何時間経過したら「滞留」警告を出すか */
export const STALE_UNCLAIMED_THRESHOLD_HOURS = 24;
/** 回答待ち（status="new"）のまま何時間経過したら「滞留」警告を出すか */
export const STALE_AWAITING_RESPONSE_THRESHOLD_HOURS = 72;

/**
 * 受付時刻からの経過時間（時間単位）。
 * サーバー・クライアントで基準時刻がずれてもハイドレーション不一致にならないよう、
 * 呼び出し側は必ず同一の `referenceDate`（サーバーが決めた基準時刻）を渡すこと。
 * 未来日時（createdAt > referenceDate）は0にclampする。
 */
export function elapsedHoursSince(createdAt: string, referenceDate: Date): number {
  const elapsedMs = referenceDate.getTime() - new Date(createdAt).getTime();
  return Math.max(0, elapsedMs / 3_600_000);
}

/**
 * 経過時間から相互排他の滞留バケットを1つ決定する。
 * 境界値（24h/72h/168hちょうど）は上位バケット側に倒す。
 */
export function resolveInquiryAgingBucket(
  createdAt: string,
  referenceDate: Date
): InquiryAgingBucket {
  const hours = elapsedHoursSince(createdAt, referenceDate);
  if (hours < 24) return "lt24h";
  if (hours < 72) return "h24to72";
  if (hours < 168) return "d3to7";
  return "gte7d";
}

export function isInquiryAgingFilterValue(value: string): value is InquiryAgingFilterValue {
  return (INQUIRY_AGING_FILTER_VALUES as readonly string[]).includes(value);
}

/**
 * バケット完全一致（グラフの内訳クリック用）とプリセット判定（警告リンク用）を
 * 同じ関数に集約する。フィルタ判定と集計を必ず同じ関数経由で行うことで、
 * 「グラフの数値」と「クリック後の一覧件数」がずれないようにする。
 */
export function matchesInquiryAging(
  createdAt: string,
  referenceDate: Date,
  value: InquiryAgingFilterValue
): boolean {
  if (value === "over24h") {
    return elapsedHoursSince(createdAt, referenceDate) >= 24;
  }
  if (value === "over72h") {
    return elapsedHoursSince(createdAt, referenceDate) >= 72;
  }
  return resolveInquiryAgingBucket(createdAt, referenceDate) === value;
}
