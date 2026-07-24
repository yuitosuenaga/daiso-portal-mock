"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export interface OverdueBadgeProps {
  /** 期限超過であるかどうか。真のときのみ描画する */
  isOverdue: boolean;
}

/**
 * 対応期限を超過しているお知らせであることを示すバッジ。
 * `isOverdue`が偽の場合は`null`を返す。超過判定ロジックは持たない。
 */
export function OverdueBadge({ isOverdue }: OverdueBadgeProps) {
  const t = useTranslations("announcements");

  if (!isOverdue) {
    return null;
  }

  return <Badge variant="incident">{t("overdueBadge")}</Badge>;
}
