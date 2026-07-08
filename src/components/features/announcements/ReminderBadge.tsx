import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export interface ReminderBadgeProps {
  /** 自社宛に未対応のままリマインドが送信されているかどうか */
  isPending: boolean;
}

/**
 * 自社宛に未対応のままリマインドが送信されているお知らせであることを示すバッジ。
 * `isPending`が真の場合のみ描画する。状態の算出ロジックは持たない。
 */
export function ReminderBadge({ isPending }: ReminderBadgeProps) {
  const t = useTranslations("announcements");

  if (!isPending) {
    return null;
  }

  return <Badge variant="urgency-high">{t("reminderBadge")}</Badge>;
}
