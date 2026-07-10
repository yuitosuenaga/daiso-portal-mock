import { getLocale, getTranslations } from "next-intl/server";

import { AnnouncementListItem } from "@/components/features/announcements/AnnouncementListItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnnouncements } from "@/lib/api/announcements";
import { isReminderPendingForCompany } from "@/lib/api/announcement-tracking";
import { requireApplicantSession } from "@/lib/server/auth-session";
import type { Announcement } from "@/types/announcement";

/**
 * 申請者側ダッシュボードの最上部、「最新のお知らせ」プレビューパネルより前に表示する、
 * 自社宛に未対応のままリマインドが送信されているお知らせのみを集めた強調表示セクション。
 *
 * 対象が1件も存在しない場合、およびデータ取得・判定に失敗した場合は`null`を返し
 * 何も描画しない（要件9.4, 9.5）。既存の`isReminderPendingForCompany`の判定結果を
 * そのまま利用し、判定ロジックを重複実装しない（要件9.6）。
 */
export async function ReminderAnnouncementsPanel() {
  let reminderAnnouncements: Announcement[];
  try {
    const { claims } = await requireApplicantSession();
    const announcements = await getAnnouncements();
    const pendingFlags = await Promise.all(
      announcements.map((announcement) =>
        isReminderPendingForCompany(announcement.id, claims.companyCode)
      )
    );
    reminderAnnouncements = announcements.filter((_, index) => pendingFlags[index]);
  } catch {
    return null;
  }

  if (reminderAnnouncements.length === 0) {
    return null;
  }

  const [t, tAnnouncements, tCategories, locale] = await Promise.all([
    getTranslations("dashboard.reminderAnnouncements"),
    getTranslations("announcements"),
    getTranslations("announcements.categories"),
    getLocale(),
  ]);

  return (
    <Card className="border-destructive/50 bg-destructive/10">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-destructive/20">
          {reminderAnnouncements.map((announcement) => (
            <AnnouncementListItem
              key={announcement.id}
              announcement={announcement}
              categoryLabel={tCategories(announcement.category)}
              actionRequiredBadgeLabel={tAnnouncements("actionRequiredBadge")}
              dueDateLabel={tAnnouncements("dueDateLabel")}
              isReminderPending
              showBodyExcerpt
              locale={locale}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
