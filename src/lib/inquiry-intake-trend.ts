import { toReferenceDateKey } from "@/lib/reference-date";
import type { Inquiry } from "@/types/inquiry";

export interface DailyIntakePoint {
  /** 日本時間（JST）基準の日付キー（`YYYY-MM-DD`） */
  dateKey: string;
  count: number;
}

export interface IntakeTrendColumn extends DailyIntakePoint {
  /** 全列のcount最大値を100%とした高さ（%）。最大が0のときは全列0 */
  heightPercent: number;
}

export const DEFAULT_INTAKE_TREND_DAYS = 7;

/**
 * `referenceDate`のJST日付を最終日として、直近`days`日分の受付件数を古い順に返す。
 * 件数0の日も欠落させず必ず`days`件返す（グラフの列が飛ばないようにするため）。
 * 日本はDSTが無いため、`referenceDate`から `i * 86_400_000` ミリ秒ずつ引いた瞬間を
 * `toReferenceDateKey`でJST日付化するだけで安全に日を遡れる。
 */
export function computeDailyIntake(
  inquiries: Inquiry[],
  referenceDate: Date,
  days: number = DEFAULT_INTAKE_TREND_DAYS
): DailyIntakePoint[] {
  const dateKeys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    dateKeys.push(toReferenceDateKey(new Date(referenceDate.getTime() - i * 86_400_000)));
  }

  const counts = new Map<string, number>(dateKeys.map((key) => [key, 0]));
  for (const inquiry of inquiries) {
    const key = toReferenceDateKey(new Date(inquiry.createdAt));
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return dateKeys.map((dateKey) => ({ dateKey, count: counts.get(dateKey) ?? 0 }));
}

/** 全pointsのcount最大値を100%としたheightPercentを付与する（最大0のときは全列0） */
export function toIntakeTrendColumns(points: DailyIntakePoint[]): IntakeTrendColumn[] {
  const maxCount = Math.max(0, ...points.map((point) => point.count));
  return points.map((point) => ({
    ...point,
    heightPercent: maxCount === 0 ? 0 : (point.count / maxCount) * 100,
  }));
}

/**
 * `dateKey`（JST日付、`YYYY-MM-DD`）をロケール向けの短縮表記に変換する。
 * サーバーの実行環境（Cloud RunはUTC既定）に依存させないため、`+09:00`オフセットを
 * 明示してJST正午の時刻として復元してからフォーマットする（日付跨ぎの誤差を避けるため正午を使う）。
 */
export function formatIntakeDateLabel(dateKey: string, locale: string): string {
  const date = new Date(`${dateKey}T12:00:00+09:00`);
  return new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" }).format(date);
}
