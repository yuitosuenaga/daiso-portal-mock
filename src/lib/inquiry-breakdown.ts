import { resolveInquiryAgingBucket } from "@/lib/inquiry-aging";
import type { InquiryAgingBucket } from "@/lib/inquiry-aging";
import type { Inquiry } from "@/types/inquiry";

const UNRESOLVED_STATUSES: Inquiry["status"][] = ["new", "in_progress"];
const CATEGORY_ORDER: Inquiry["category"][] = ["defect", "order", "system", "other"];
const AGING_BUCKET_ORDER: InquiryAgingBucket[] = ["lt24h", "h24to72", "d3to7", "gte7d"];

/**
 * ダッシュボード/一覧の横棒グラフ描画用の共有行データ形式。
 * `label`が`null`の行はi18n側でラベルを解決する（"others"等、キーだけでは文言が決まらないため）。
 */
export interface StatsBarRow {
  key: string;
  label: string | null;
  count: number;
  /** 表示される全行のcount最大値を100%とした共有スケール上の幅（%） */
  barPercent: number;
  colorClass?: string;
}

/** 案件種別別の件数を、0件のカテゴリも0で埋めた固定キーで返す */
export function countByCategory(inquiries: Inquiry[]): Record<Inquiry["category"], number> {
  const result: Record<Inquiry["category"], number> = {
    defect: 0,
    order: 0,
    system: 0,
    other: 0,
  };
  for (const inquiry of inquiries) {
    result[inquiry.category] += 1;
  }
  return result;
}

/**
 * 未解決（new・in_progress）のみを母集団に、国別件数をcount降順→country昇順で返す。
 * resolvedを含めないのは、対応不要になった件数で国別の負荷感をぼかさないため。
 */
export function countUnresolvedByCountry(
  inquiries: Inquiry[]
): { country: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const inquiry of inquiries) {
    if (!UNRESOLVED_STATUSES.includes(inquiry.status)) {
      continue;
    }
    const country = inquiry.submittedBy.country;
    counts.set(country, (counts.get(country) ?? 0) + 1);
  }
  return Array.from(counts, ([country, count]) => ({ country, count })).sort(
    (a, b) => b.count - a.count || a.country.localeCompare(b.country)
  );
}

/** 未解決のみを母集団に、滞留時間バケット別件数を返す（4キー固定、0件のバケットも保持） */
export function countUnresolvedAging(
  inquiries: Inquiry[],
  referenceDate: Date
): Record<InquiryAgingBucket, number> {
  const result: Record<InquiryAgingBucket, number> = {
    lt24h: 0,
    h24to72: 0,
    d3to7: 0,
    gte7d: 0,
  };
  for (const inquiry of inquiries) {
    if (!UNRESOLVED_STATUSES.includes(inquiry.status)) {
      continue;
    }
    const bucket = resolveInquiryAgingBucket(inquiry.createdAt, referenceDate);
    result[bucket] += 1;
  }
  return result;
}

/** 未解決のうち最古の経過時間（時間）。未解決が0件ならnull */
export function findOldestUnresolvedHours(
  inquiries: Inquiry[],
  referenceDate: Date
): number | null {
  const unresolvedCreatedAts = inquiries
    .filter((inquiry) => UNRESOLVED_STATUSES.includes(inquiry.status))
    .map((inquiry) => new Date(inquiry.createdAt).getTime());

  if (unresolvedCreatedAts.length === 0) {
    return null;
  }

  const oldestCreatedAt = Math.min(...unresolvedCreatedAts);
  return Math.max(0, (referenceDate.getTime() - oldestCreatedAt) / 3_600_000);
}

/** count最大値=100%の共有スケールでbarPercentを付与する（0件行も残す。0除算はMath.max(1,...)で回避） */
export function withSharedBarScale(rows: Omit<StatsBarRow, "barPercent">[]): StatsBarRow[] {
  const maxCount = Math.max(1, ...rows.map((row) => row.count));
  return rows.map((row) => ({ ...row, barPercent: (row.count / maxCount) * 100 }));
}

export function toCategoryBarRows(
  byCategory: Record<Inquiry["category"], number>,
  categoryLabels: Record<Inquiry["category"], string>
): StatsBarRow[] {
  return withSharedBarScale(
    CATEGORY_ORDER.map((category) => ({
      key: category,
      label: categoryLabels[category],
      count: byCategory[category],
    }))
  );
}

export function toAgingBarRows(
  aging: Record<InquiryAgingBucket, number>,
  labels: Record<InquiryAgingBucket, string>
): StatsBarRow[] {
  return withSharedBarScale(
    AGING_BUCKET_ORDER.map((bucket) => ({
      key: bucket,
      label: labels[bucket],
      count: aging[bucket],
    }))
  );
}

/**
 * 国別件数を上位`maxRows`件＋"others"1行に畳んで返す（既存`toStaffLoadRows`と同じ畳み方）。
 * "others"行は`label: null`（i18n側で「ほかN件」等を解決するため）。
 */
export function toCountryBarRows(
  byCountry: { country: string; count: number }[],
  countryLabels: Record<string, string>,
  options?: { maxRows?: number }
): StatsBarRow[] {
  const maxRows = options?.maxRows ?? 5;

  const visible = byCountry.slice(0, maxRows);
  const rest = byCountry.slice(maxRows);

  const rows: Omit<StatsBarRow, "barPercent">[] = visible.map(({ country, count }) => ({
    key: country,
    label: countryLabels[country] ?? country,
    count,
  }));

  if (rest.length > 0) {
    rows.push({
      key: "others",
      label: null,
      count: rest.reduce((sum, row) => sum + row.count, 0),
    });
  }

  return withSharedBarScale(rows);
}
