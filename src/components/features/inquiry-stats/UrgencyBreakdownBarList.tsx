"use client";

import { cn } from "@/lib/utils";
import type { UrgencyRow } from "@/lib/inquiry-stats";
import type { Inquiry } from "@/types/inquiry";

export interface UrgencyBreakdownBarListProps {
  rows: UrgencyRow[];
  urgencyLabels: Record<Inquiry["urgency"], string>;
  unitLabel: string;
  emptyMessage: string;
  /** 現在一覧に適用されているurgencyフィルタ。行の選択状態表示に使う */
  selectedUrgency?: Inquiry["urgency"] | null;
  /** 指定すると各行がクリック可能になり、クリックした緊急度で一覧を絞り込めるようになる */
  onSelect?: (urgency: Inquiry["urgency"]) => void;
}

const ROW_COLOR_CLASS: Record<Inquiry["urgency"], string> = {
  high: "bg-chart-urgency-high",
  medium: "bg-chart-urgency-medium",
  low: "bg-chart-urgency-low",
};

/**
 * 未解決問い合わせの緊急度別件数（high/medium/low）を横棒リストで表示する。
 * 3行を常に固定表示し、同一スケール（3行のcount最大値=100%）で比較できるようにする。
 */
export function UrgencyBreakdownBarList({
  rows,
  urgencyLabels,
  unitLabel,
  emptyMessage,
  selectedUrgency = null,
  onSelect,
}: UrgencyBreakdownBarListProps) {
  const hasAny = rows.some((row) => row.count > 0);

  return (
    <div>
      <ul className="space-y-2.5">
        {rows.map((row) => {
          const selected = selectedUrgency === row.urgency;
          const content = (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs text-foreground">
                  {urgencyLabels[row.urgency]}
                </span>
                <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                  {row.count}
                  {unitLabel}
                </span>
              </div>
              <div className="mt-1 h-2 w-full">
                <div
                  className={cn("h-full rounded-r-[4px]", ROW_COLOR_CLASS[row.urgency])}
                  style={{ width: `${row.barPercent}%` }}
                />
              </div>
            </>
          );

          return (
            <li key={row.urgency}>
              {onSelect ? (
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(row.urgency)}
                  className={cn(
                    "w-full rounded-md px-1 py-0.5 text-left hover:bg-muted/60",
                    selected && "bg-accent"
                  )}
                >
                  {content}
                </button>
              ) : (
                <div className="rounded-md px-1 py-0.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      {!hasAny && (
        <p className="mt-2 text-xs text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  );
}
