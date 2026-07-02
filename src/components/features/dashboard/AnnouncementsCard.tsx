import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getAnnouncements } from "@/lib/api/announcements";
import type { Announcement } from "@/types/announcement";
import { NavigationCard, type NavigationCardBadge } from "@/components/features/dashboard/NavigationCard";

const DEFAULT_RECENT_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface AnnouncementsCardProps {
  href: string;
  titleKey: string;
  descriptionKey: string;
  /** 新着とみなす日数（既定値: 7） */
  recentDays?: number;
}

function countRecentAnnouncements(
  announcements: Announcement[],
  recentDays: number
): number {
  const cutoff = Date.now() - recentDays * MS_PER_DAY;
  return announcements.filter(
    (announcement) => new Date(announcement.publishedAt).getTime() >= cutoff
  ).length;
}

export async function AnnouncementsCard({
  href,
  titleKey,
  descriptionKey,
  recentDays = DEFAULT_RECENT_DAYS,
}: AnnouncementsCardProps) {
  const t = await getTranslations();

  let badge: NavigationCardBadge | undefined;
  try {
    const announcements = await getAnnouncements();
    const recentCount = countRecentAnnouncements(announcements, recentDays);
    if (recentCount > 0) {
      badge = { count: recentCount, variant: "default" };
    }
  } catch {
    badge = undefined;
  }

  return (
    <NavigationCard
      title={t(titleKey)}
      description={t(descriptionKey)}
      href={href}
      icon={Bell}
      badge={badge}
    />
  );
}
