"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface StatsMetricTileProps {
  label: string;
  value: number;
  /** 0件のときにvalueの代わりに出す文言。未指定時は0をそのまま表示する */
  zeroLabel?: string;
  caption?: string;
  /** "hero"=text-5xl（一覧サイドバーの主要値）, "primary"=text-4xl（ダッシュボード）, "secondary"=text-2xl */
  size?: "hero" | "primary" | "secondary";
  tone?: "default" | "primary" | "destructive";
  /** 指定すると数値がクリック可能になり、一覧側の状態をページ内で直接トグルする（一覧画面向け） */
  selected?: boolean;
  onSelect?: () => void;
  /** 指定すると数値がリンク化され、他画面（一覧画面）へ絞り込み付きで遷移する（ダッシュボード向け）。`onSelect`と同時指定時は`onSelect`を優先する */
  href?: string;
}

const SIZE_CLASS: Record<NonNullable<StatsMetricTileProps["size"]>, string> = {
  hero: "text-5xl font-semibold",
  primary: "text-4xl font-bold",
  secondary: "text-2xl font-semibold",
};

const TONE_CLASS: Record<NonNullable<StatsMetricTileProps["tone"]>, string> = {
  default: "text-foreground",
  primary: "text-primary",
  destructive: "text-destructive",
};

/**
 * 「ラベル＋大きい数値＋補足」を表示する数値タイル。既存の一覧サイドバー
 * （`InquiryStatsPanel`/`HelpdeskInquiryStatsPanel`）の数値表示スタイルを共通化し、
 * ダッシュボードのKPIパネルとも見た目・意味を統一する。
 */
export function StatsMetricTile({
  label,
  value,
  zeroLabel,
  caption,
  size = "primary",
  tone = "default",
  selected = false,
  onSelect,
  href,
}: StatsMetricTileProps) {
  const valueClassName = cn(SIZE_CLASS[size], TONE_CLASS[tone]);
  const valueContent = value === 0 && zeroLabel ? zeroLabel : value;

  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {onSelect ? (
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          className={cn(
            "-mx-1 rounded-md px-1 text-left hover:bg-muted/60",
            selected && "bg-accent"
          )}
        >
          <p className={valueClassName}>{valueContent}</p>
        </button>
      ) : href ? (
        <Link href={href} className="-mx-1 block rounded-md px-1 hover:bg-muted/60">
          <p className={valueClassName}>{valueContent}</p>
        </Link>
      ) : (
        <p className={valueClassName}>{valueContent}</p>
      )}
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}
