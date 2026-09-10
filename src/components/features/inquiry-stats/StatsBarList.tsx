"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface StatsBarListRow {
  key: string;
  /** ラベル解決（"ほかN件"等）は呼び出し側（useTranslationsを使える"use client"の親）で行い、常に解決済みの文字列を渡す */
  label: string;
  count: number;
  /** 表示される全行のcount最大値を100%とした共有スケール上の幅（%） */
  barPercent: number;
  colorClass?: string;
}

export interface StatsBarListProps {
  rows: StatsBarListRow[];
  unitLabel: string;
  emptyMessage?: string;
  defaultColorClass?: string;
  /** 現在一覧に適用されている絞り込みと一致するrow.keyを渡すと選択状態を表示する（onSelectKeyモード用） */
  selectedKey?: string | null;
  /** 指定すると各行がクリック可能になり、一覧側の状態をページ内で直接トグルする（一覧画面向け） */
  onSelectKey?: (key: string) => void;
  /**
   * 指定すると各行がリンク化され、クリックで他画面（一覧画面）へ絞り込み付きで遷移する（ダッシュボード向け）。
   * RSC境界を越えて関数を渡せないため、キー→URL文字列のMapで表現する。`onSelectKey`と同時指定時は`onSelectKey`を優先する。
   */
  hrefByKey?: Record<string, string>;
}

/**
 * カテゴリ別・滞留時間別・国別など、単一系列の横棒リストを描画する汎用プリミティブ。
 * `StaffLoadBarList`/`UrgencyBreakdownBarList`と同じマークアップ（ラベル+件数+幅%バー）を採用し、
 * 見た目の一貫性を保つ。ダッシュボード（Server Component、`hrefByKey`）と
 * 一覧画面（Client Component、`onSelectKey`）の両方から利用できるよう3モードを持つ。
 */
export function StatsBarList({
  rows,
  unitLabel,
  emptyMessage,
  defaultColorClass = "bg-chart-status-in-progress",
  selectedKey = null,
  onSelectKey,
  hrefByKey,
}: StatsBarListProps) {
  const hasAny = rows.some((row) => row.count > 0);

  return (
    <div>
      <ul className="space-y-2.5">
        {rows.map((row) => {
          const selected = Boolean(onSelectKey) && selectedKey === row.key;
          const content = (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs text-foreground">
                  {row.label}
                </span>
                <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                  {row.count}
                  {unitLabel}
                </span>
              </div>
              <div className="mt-1 h-2 w-full">
                <div
                  className={cn(
                    "h-full rounded-r-[4px]",
                    row.colorClass ?? defaultColorClass
                  )}
                  style={{ width: `${row.barPercent}%` }}
                />
              </div>
            </>
          );

          return (
            <li key={row.key}>
              {onSelectKey ? (
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectKey(row.key)}
                  className={cn(
                    "w-full rounded-md px-1 py-0.5 text-left hover:bg-muted/60",
                    selected && "bg-accent"
                  )}
                >
                  {content}
                </button>
              ) : hrefByKey?.[row.key] ? (
                <Link
                  href={hrefByKey[row.key]}
                  className="block rounded-md px-1 py-0.5 hover:bg-muted/60"
                >
                  {content}
                </Link>
              ) : (
                <div className="rounded-md px-1 py-0.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      {!hasAny && emptyMessage && (
        <p className="mt-2 text-xs text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  );
}
