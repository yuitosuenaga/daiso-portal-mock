"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export interface ConfirmedStatusBadgeProps {
  /** 自社が既に確認済みかどうか */
  isConfirmed: boolean;
}

/**
 * 自社が確認済みであることを示すバッジ。`isConfirmed`が真の場合のみ描画する。
 * 詳細画面（`AnnouncementSelfReportPanel`）・一覧画面（`AnnouncementListItem`）の
 * いずれからも読み取り専用の表示として利用される。状態の記録ロジックは持たない。
 */
export function ConfirmedStatusBadge({ isConfirmed }: ConfirmedStatusBadgeProps) {
  const t = useTranslations("announcements.selfReport");

  if (!isConfirmed) {
    return null;
  }

  return <Badge variant="muted">{t("confirmed")}</Badge>;
}

export interface CompletedStatusBadgeProps {
  /** 自社が既に対応完了済みかどうか */
  isCompleted: boolean;
}

/**
 * 自社が対応完了済みであることを示すバッジ。`isCompleted`が真の場合のみ描画する。
 * 呼び出し側で対応要否（`actionRequired`）による表示制御を行う。状態の記録ロジックは持たない。
 */
export function CompletedStatusBadge({ isCompleted }: CompletedStatusBadgeProps) {
  const t = useTranslations("announcements.selfReport");

  if (!isCompleted) {
    return null;
  }

  return <Badge variant="default">{t("completed")}</Badge>;
}
