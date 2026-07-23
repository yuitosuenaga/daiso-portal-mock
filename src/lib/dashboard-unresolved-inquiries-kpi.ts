import type { Inquiry } from "@/types/inquiry";

const UNRESOLVED_STATUSES: Inquiry["status"][] = ["new", "in_progress"];

/**
 * 「当日」の判定基準とするタイムゾーン。本ポータルの利用主体（日本大創側ヘルプデスク担当者）
 * の業務日を基準とするため、サーバーの実行環境（本番のCloud Run等ではUTCが既定）に依存せず
 * 常に日本時間（JST, UTC+9）で日付境界を判定する。
 */
const REFERENCE_TIME_ZONE = "Asia/Tokyo";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REFERENCE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export interface UnresolvedInquiriesKpi {
  /** 全社の未対応（新規・対応中）件数 */
  total: number;
  /** 未対応のうち、受付日時（createdAt）が当日（日本時間基準）のもの */
  today: number;
}

/**
 * 日付を日本時間（JST）基準の日付キー文字列（`YYYY-MM-DD`）に変換する。
 * サーバーの実行環境のタイムゾーンに関わらず同一の判定結果になるよう、
 * `Intl.DateTimeFormat`に明示的に`timeZone`を指定して算出する。
 */
function toReferenceDateKey(date: Date): string {
  return dateKeyFormatter.format(date);
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
