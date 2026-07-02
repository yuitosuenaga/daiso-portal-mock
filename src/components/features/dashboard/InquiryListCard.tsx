import { List } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  getAllInquiryStatusSummary,
  getInquiryStatusSummary,
} from "@/lib/api/inquiries";
import type { InquiryStatusSummary } from "@/types/inquiry-summary";
import {
  NavigationCard,
  type NavigationCardBadge,
} from "@/components/features/dashboard/NavigationCard";

export type InquiryListCardScope = "own" | "all";

export interface InquiryListCardProps {
  scope: InquiryListCardScope;
  href: string;
  titleKey: string;
  descriptionKey: string;
}

function countUnresolved(summary: InquiryStatusSummary): number {
  return summary.new + summary.in_progress;
}

/**
 * 問い合わせ状況（自社/全社）を集計し、未対応件数バッジ付きの`NavigationCard`を描画する。
 * `scope` に応じて集計元のAPIを切り替える。集計取得に失敗した場合は、
 * バッジなしの`NavigationCard`にフォールバックし、例外を上位へ伝播させない。
 */
export async function InquiryListCard({
  scope,
  href,
  titleKey,
  descriptionKey,
}: InquiryListCardProps) {
  const t = await getTranslations();
  const title = t(titleKey);
  const description = t(descriptionKey);

  let badge: NavigationCardBadge | undefined;
  try {
    const summary =
      scope === "own"
        ? await getInquiryStatusSummary()
        : await getAllInquiryStatusSummary();

    const unresolvedCount = countUnresolved(summary);
    if (unresolvedCount > 0) {
      badge = { count: unresolvedCount, variant: "urgency-high" };
    }
  } catch {
    badge = undefined;
  }

  return (
    <NavigationCard
      title={title}
      description={description}
      href={href}
      icon={List}
      badge={badge}
    />
  );
}
