import { getTranslations, getLocale } from "next-intl/server";
import { getAnnouncements } from "@/lib/api/announcements";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ANNOUNCEMENT_CATEGORY_CODES } from "@/lib/constants/announcement-options";
import { AnnouncementListItem } from "@/components/features/announcements/AnnouncementListItem";
import type { Announcement, AnnouncementCategory } from "@/types/announcement";

export async function AnnouncementList() {
  const [t, locale] = await Promise.all([
    getTranslations("announcements"),
    getLocale(),
  ]);

  let announcements: Announcement[];
  try {
    announcements = await getAnnouncements();
  } catch {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("list.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("list.error")}</p>
        </CardContent>
      </Card>
    );
  }

  const categoryLabels = ANNOUNCEMENT_CATEGORY_CODES.reduce(
    (labels, code) => {
      labels[code] = t(`categories.${code}`);
      return labels;
    },
    {} as Record<AnnouncementCategory, string>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("list.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("list.empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {announcements.map((item) => (
              <AnnouncementListItem
                key={item.id}
                announcement={item}
                categoryLabel={categoryLabels[item.category]}
                locale={locale}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AnnouncementListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}
