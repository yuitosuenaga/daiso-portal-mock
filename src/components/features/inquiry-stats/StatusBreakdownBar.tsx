"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { StatusSegment } from "@/lib/helpdesk-inquiry-stats";
import type { Inquiry } from "@/types/inquiry";

const STATUS_COLOR_CLASS: Record<Inquiry["status"], string> = {
  new: "bg-chart-status-new",
  in_progress: "bg-chart-status-in-progress",
  resolved: "bg-chart-status-resolved",
};

export interface StatusBreakdownBarProps {
  segments: StatusSegment[];
  statusLabels: Record<Inquiry["status"], string>;
  unitLabel: string;
  /** 現在一覧に適用されているstatusフィルタ。セグメント/凡例の選択状態表示に使う */
  selectedStatus?: Inquiry["status"] | null;
  /**
   * 指定するとセグメント・凡例がクリック可能になり、クリックしたstatusで
   * 一覧を絞り込めるようになる（再度同じstatusを選ぶと呼び出し元で解除する想定）。
   */
  onSelect?: (status: Inquiry["status"]) => void;
  /**
   * 指定するとセグメント・凡例がリンク化され、他画面（一覧画面）へ絞り込み付きで遷移する
   * （ダッシュボード向け）。`onSelect`と同時指定時は`onSelect`を優先する。
   */
  hrefByStatus?: Partial<Record<Inquiry["status"], string>>;
}

/**
 * status別内訳を横幅100%積み上げバー＋凡例で表示する。
 * セグメント内には数値を置かず（幅が狭いと確実にはみ出るため）、凡例の件数がラベルを兼ねる。
 * ホバー/フォーカスで該当セグメントの件数を上部に表示する（凡例と同じ情報の補助表示）。
 */
export function StatusBreakdownBar({
  segments,
  statusLabels,
  unitLabel,
  selectedStatus = null,
  onSelect,
  hrefByStatus,
}: StatusBreakdownBarProps) {
  const [activeStatus, setActiveStatus] = useState<Inquiry["status"] | null>(
    null
  );

  const activeSegment = segments.find(
    (segment) => segment.status === activeStatus
  );

  return (
    <div>
      <p
        className="mb-1 h-4 text-xs text-foreground"
        role="status"
        aria-live="polite"
      >
        {activeSegment && (
          <>
            <span className="font-semibold tabular-nums">
              {activeSegment.count}
            </span>
            {unitLabel} {statusLabels[activeSegment.status]}
          </>
        )}
      </p>
      <div className="flex h-3 w-full gap-0.5">
        {segments.map((segment, index) => {
          const selected = selectedStatus === segment.status;
          const segmentClassName = cn(
            "relative h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']",
            STATUS_COLOR_CLASS[segment.status],
            index === 0 && "rounded-l-[4px]",
            index === segments.length - 1 && "rounded-r-[4px]",
            selected && "ring-2 ring-ring ring-offset-1"
          );
          const segmentStyle = { width: `${segment.percent}%` };
          const hoverHandlers = {
            onPointerEnter: () => setActiveStatus(segment.status),
            onPointerLeave: () => setActiveStatus(null),
            onFocus: () => setActiveStatus(segment.status),
            onBlur: () => setActiveStatus(null),
          };
          const href = hrefByStatus?.[segment.status];

          if (!onSelect && href) {
            return (
              <Link
                key={segment.status}
                href={href}
                aria-label={`${statusLabels[segment.status]}: ${segment.count}${unitLabel}`}
                className={segmentClassName}
                style={segmentStyle}
                {...hoverHandlers}
              />
            );
          }

          return (
            <button
              key={segment.status}
              type="button"
              aria-label={`${statusLabels[segment.status]}: ${segment.count}${unitLabel}`}
              aria-pressed={onSelect ? selected : undefined}
              className={segmentClassName}
              style={segmentStyle}
              onClick={onSelect ? () => onSelect(segment.status) : undefined}
              {...hoverHandlers}
            />
          );
        })}
      </div>
      <ul className="mt-2 space-y-1">
        {segments.map((segment) => {
          const selected = selectedStatus === segment.status;
          const content = (
            <>
              <span className="flex items-center gap-1.5 text-foreground">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2.5 w-2.5 rounded-[2px]",
                    STATUS_COLOR_CLASS[segment.status]
                  )}
                />
                {statusLabels[segment.status]}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {segment.count}
                {unitLabel}
              </span>
            </>
          );

          const legendHref = hrefByStatus?.[segment.status];

          return (
            <li key={segment.status}>
              {onSelect ? (
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(segment.status)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-muted/60",
                    selected && "bg-accent"
                  )}
                >
                  {content}
                </button>
              ) : legendHref ? (
                <Link
                  href={legendHref}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-muted/60"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-2 text-xs">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
