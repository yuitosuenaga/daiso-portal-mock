import {
  CheckCircle2,
  MessageSquare,
  RefreshCcw,
  Reply,
  Undo2,
  type LucideIcon,
} from "lucide-react";

import type { InquiryHistoryEntryType } from "@/types/inquiry-history";

export interface InquiryHistoryTypeStyle {
  icon: LucideIcon;
  markerClassName: string;
  badgeClassName: string;
}

/**
 * 対応履歴タイムラインの種別ごとの見た目（アイコン・配色）。
 * 配色は `globals.css` の既存デザイントークンのみを使用する。
 * 申請者側（`InquiryHistoryList`）・ヘルプデスク側（`HistoryTimeline`）で共有する。
 */
const INQUIRY_HISTORY_STYLE: Record<
  InquiryHistoryEntryType,
  InquiryHistoryTypeStyle
> = {
  reply_sent: {
    icon: Reply,
    markerClassName: "border-primary/40 bg-primary/10 text-primary",
    badgeClassName: "bg-primary/10 text-primary",
  },
  requester_message: {
    icon: MessageSquare,
    markerClassName: "border-accent-foreground/30 bg-accent text-accent-foreground",
    badgeClassName: "bg-accent text-accent-foreground",
  },
  claimed: {
    icon: CheckCircle2,
    markerClassName: "border-success/40 bg-success/10 text-success",
    badgeClassName: "bg-success/10 text-success",
  },
  released: {
    icon: Undo2,
    markerClassName:
      "border-secondary-foreground/20 bg-secondary text-secondary-foreground",
    badgeClassName: "bg-secondary text-secondary-foreground",
  },
  status_changed: {
    icon: RefreshCcw,
    markerClassName: "border-border bg-muted text-muted-foreground",
    badgeClassName: "bg-muted text-muted-foreground",
  },
};

export function getInquiryHistoryStyle(
  type: InquiryHistoryEntryType
): InquiryHistoryTypeStyle {
  return INQUIRY_HISTORY_STYLE[type];
}
