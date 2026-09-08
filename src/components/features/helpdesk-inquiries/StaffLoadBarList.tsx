"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { StaffLoadRow } from "@/lib/helpdesk-inquiry-stats";

export interface StaffLoadBarListProps {
  rows: StaffLoadRow[];
}

const ROW_COLOR_CLASS: Record<StaffLoadRow["kind"], string> = {
  unclaimed: "bg-chart-status-new",
  staff: "bg-chart-status-in-progress",
  others: "bg-border",
};

/**
 * 「未着手＋対応者別」の件数を横棒リストで表示する。
 * 未着手行を先頭に固定し、対応者の負荷と同一スケール（全行のcount最大値=100%）で比較できるようにする。
 * 1系列のみの構成（未着手/対応者/その他はいずれも「未対応件数の内訳」という単一の意味軸）のため凡例は置かない。
 */
export function StaffLoadBarList({ rows }: StaffLoadBarListProps) {
  const t = useTranslations("helpdeskInquiries.stats");

  const hasStaffRows = rows.some(
    (row) => row.kind === "staff" || row.kind === "others"
  );

  function labelFor(row: StaffLoadRow): string {
    if (row.kind === "unclaimed") {
      return t("unclaimedLabel");
    }
    if (row.kind === "others") {
      return t("staffOthers", { count: row.staffCount ?? 0 });
    }
    return row.label ?? "";
  }

  return (
    <div>
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li
            key={row.key}
            className="rounded-md px-1 py-0.5 hover:bg-muted/60"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs text-foreground">
                {labelFor(row)}
              </span>
              <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                {row.count}
                {t("unit")}
              </span>
            </div>
            <div className="mt-1 h-2 w-full">
              <div
                className={cn("h-full rounded-r-[4px]", ROW_COLOR_CLASS[row.kind])}
                style={{ width: `${row.barPercent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {!hasStaffRows && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("staffLoadEmpty")}
        </p>
      )}
    </div>
  );
}
