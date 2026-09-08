"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
}

/**
 * status別内訳を横幅100%積み上げバー＋凡例で表示する。
 * セグメント内には数値を置かず（幅が狭いと確実にはみ出るため）、凡例の件数がラベルを兼ねる。
 * ホバー/フォーカスで該当セグメントの件数を上部に表示する（凡例と同じ情報の補助表示）。
 */
export function StatusBreakdownBar({
  segments,
  statusLabels,
}: StatusBreakdownBarProps) {
  const t = useTranslations("helpdeskInquiries.stats");
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
            {t("unit")} {statusLabels[activeSegment.status]}
          </>
        )}
      </p>
      <div className="flex h-3 w-full gap-0.5">
        {segments.map((segment, index) => (
          <button
            key={segment.status}
            type="button"
            aria-label={`${statusLabels[segment.status]}: ${segment.count}${t("unit")}`}
            className={cn(
              "relative h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              "before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']",
              STATUS_COLOR_CLASS[segment.status],
              index === 0 && "rounded-l-[4px]",
              index === segments.length - 1 && "rounded-r-[4px]"
            )}
            style={{ width: `${segment.percent}%` }}
            onPointerEnter={() => setActiveStatus(segment.status)}
            onPointerLeave={() => setActiveStatus(null)}
            onFocus={() => setActiveStatus(segment.status)}
            onBlur={() => setActiveStatus(null)}
          />
        ))}
      </div>
      <ul className="mt-2 space-y-1">
        {segments.map((segment) => (
          <li
            key={segment.status}
            className="flex items-center justify-between gap-2 text-xs"
          >
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
              {t("unit")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
