import { getLocale, getTranslations } from "next-intl/server";

import { HelpdeskInquiryListItem } from "@/components/features/helpdesk-inquiries/HelpdeskInquiryListItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { getAllInquiries } from "@/lib/api/inquiries";
import { sortInquiriesForPriorityPreview } from "@/lib/dashboard-priority-inquiries";
import {
  INQUIRY_CATEGORY_CODES,
  INQUIRY_COUNTRY_CODES,
  INQUIRY_URGENCY_CODES,
} from "@/lib/constants/inquiry-options";
import type { Inquiry } from "@/types/inquiry";

const PREVIEW_LIMIT = 5;
const SKELETON_ITEM_COUNT = 3;
const UNRESOLVED_STATUSES: Inquiry["status"][] = ["new", "in_progress"];

export interface PriorityInquiriesPreviewPanelProps {
  /** 問い合わせ一覧ページへの遷移先パス（例: "/helpdesk/inquiries"） */
  viewAllHref: string;
}

/**
 * ヘルプデスク側ダッシュボードのナビゲーションカード群下部に表示する
 * 「対応が必要な申請」プレビューパネル。
 *
 * 全社の問い合わせのうちステータスが新規または対応中のものを対象に、
 * 未着手優先・緊急度・受付日時の順で並び替えた上位5件を一覧表示する。
 * データ取得に失敗した場合は例外を上位へ伝播させず、パネル内にエラー状態を表示する。
 */
export async function PriorityInquiriesPreviewPanel({
  viewAllHref,
}: PriorityInquiriesPreviewPanelProps) {
  const [t, tOptions, tStatus, tClaim, tHelpdeskList, locale] = await Promise.all([
    getTranslations("dashboard.priorityInquiriesPreview"),
    getTranslations("inquiryForm.options"),
    getTranslations("inquiryList.status"),
    getTranslations("helpdeskInquiries.claim"),
    getTranslations("helpdeskInquiries.list"),
    getLocale(),
  ]);

  let priorityInquiries: Inquiry[] | null = null;
  try {
    const inquiries = await getAllInquiries();
    const unresolved = inquiries.filter((inquiry) =>
      UNRESOLVED_STATUSES.includes(inquiry.status)
    );
    priorityInquiries = sortInquiriesForPriorityPreview(unresolved).slice(
      0,
      PREVIEW_LIMIT
    );
  } catch {
    priorityInquiries = null;
  }

  const categoryLabels = INQUIRY_CATEGORY_CODES.reduce(
    (labels, code) => {
      labels[code] = tOptions(`category.${code}`);
      return labels;
    },
    {} as Record<Inquiry["category"], string>
  );

  const urgencyLabels = INQUIRY_URGENCY_CODES.reduce(
    (labels, code) => {
      labels[code] = tOptions(`urgency.${code}`);
      return labels;
    },
    {} as Record<Inquiry["urgency"], string>
  );

  const countryLabels = INQUIRY_COUNTRY_CODES.reduce(
    (labels, code) => {
      labels[code] = tOptions(`country.${code}`);
      return labels;
    },
    {} as Record<string, string>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {priorityInquiries === null ? (
          <p role="alert" className="text-sm text-destructive">
            {t("error")}
          </p>
        ) : priorityInquiries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {priorityInquiries.map((inquiry) => (
              <HelpdeskInquiryListItem
                key={inquiry.id}
                inquiry={inquiry}
                categoryLabel={categoryLabels[inquiry.category]}
                urgencyLabel={urgencyLabels[inquiry.urgency]}
                statusLabel={tStatus(inquiry.status)}
                countryLabel={countryLabels[inquiry.submittedBy.country]}
                claimBadgeLabel={tClaim("inProgressBadge")}
                claimedByLabel={tClaim("claimedByLabel")}
                locale={locale}
                untitledLabel={tHelpdeskList("untitled")}
              />
            ))}
          </ul>
        )}
        <Link
          href={viewAllHref}
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          {t("viewAll")}
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * `PriorityInquiriesPreviewPanel` のデータ取得中に表示するSuspenseフォールバック。
 * パネル本体と同様のCardレイアウトで、リスト項目分のスケルトンを表示する。
 */
export function PriorityInquiriesPreviewPanelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y divide-border">
          {Array.from({ length: SKELETON_ITEM_COUNT }, (_, index) => (
            <li key={index} className="space-y-2 py-3 first:pt-0 last:pb-0">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </li>
          ))}
        </ul>
        <Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
}
