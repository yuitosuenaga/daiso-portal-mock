/**
 * 「当日」の判定基準とするタイムゾーン。本ポータルの利用主体（日本大創側ヘルプデスク担当者）
 * の業務日を基準とするため、サーバーの実行環境（本番のCloud Run等ではUTCが既定）に依存せず
 * 常に日本時間（JST, UTC+9）で日付境界を判定する。
 */
export const REFERENCE_TIME_ZONE = "Asia/Tokyo";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REFERENCE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * 日付を日本時間（JST）基準の日付キー文字列（`YYYY-MM-DD`）に変換する。
 * サーバーの実行環境のタイムゾーンに関わらず同一の判定結果になるよう、
 * `Intl.DateTimeFormat`に明示的に`timeZone`を指定して算出する。
 */
export function toReferenceDateKey(date: Date): string {
  return dateKeyFormatter.format(date);
}
