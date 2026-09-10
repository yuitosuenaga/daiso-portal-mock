"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatIntakeDateLabel, type IntakeTrendColumn } from "@/lib/inquiry-intake-trend";

export interface IntakeTrendBarChartProps {
  columns: IntakeTrendColumn[];
  locale: string;
  unitLabel: string;
  emptyMessage: string;
  columnAriaLabel: (dateLabel: string, count: number) => string;
  /** 指定すると各列がクリック可能になり、一覧側の状態をページ内で直接トグルする（一覧画面向け） */
  selectedDateKey?: string | null;
  onSelectDateKey?: (dateKey: string) => void;
  /** 指定すると各列がリンク化され、他画面（一覧画面）へ絞り込み付きで遷移する（ダッシュボード向け）。`onSelectDateKey`と同時指定時は`onSelectDateKey`を優先する */
  hrefByDateKey?: Record<string, string>;
}

/**
 * 直近N日分の受付/送信件数を縦棒で表示する。グラフライブラリを使わず、
 * 既存の横棒（`StatsBarList`等）と同じ「CSS幅%指定のdiv/button/Link」の考え方を
 * 縦方向（高さ%）に転用したもの。
 */
export function IntakeTrendBarChart({
  columns,
  locale,
  unitLabel,
  emptyMessage,
  columnAriaLabel,
  selectedDateKey = null,
  onSelectDateKey,
  hrefByDateKey,
}: IntakeTrendBarChartProps) {
  const hasAny = columns.some((column) => column.count > 0);

  return (
    <div>
      <div className="flex h-24 items-end gap-1">
        {columns.map((column) => {
          const dateLabel = formatIntakeDateLabel(column.dateKey, locale);
          const ariaLabel = columnAriaLabel(dateLabel, column.count);
          const selected = Boolean(onSelectDateKey) && selectedDateKey === column.dateKey;

          const bar = (
            <div className="flex h-full w-full flex-col items-center justify-end">
              <div
                className={cn(
                  "w-full rounded-t-[3px] bg-chart-status-in-progress",
                  selected && "ring-2 ring-ring ring-offset-1"
                )}
                style={{ height: `${Math.max(column.heightPercent, column.count > 0 ? 4 : 0)}%` }}
              />
            </div>
          );

          return (
            <div key={column.dateKey} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end">
                {onSelectDateKey ? (
                  <button
                    type="button"
                    aria-label={ariaLabel}
                    aria-pressed={selected}
                    onClick={() => onSelectDateKey(column.dateKey)}
                    className="h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {bar}
                  </button>
                ) : hrefByDateKey?.[column.dateKey] ? (
                  <Link
                    href={hrefByDateKey[column.dateKey]}
                    aria-label={ariaLabel}
                    className="h-full w-full"
                  >
                    {bar}
                  </Link>
                ) : (
                  <div aria-label={ariaLabel} className="h-full w-full">
                    {bar}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {column.count}
                {unitLabel}
              </span>
            </div>
          );
        })}
      </div>
      {!hasAny && <p className="mt-2 text-xs text-muted-foreground">{emptyMessage}</p>}
    </div>
  );
}
