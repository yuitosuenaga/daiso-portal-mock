import { getTranslations, getLocale } from "next-intl/server";
import { getAnnouncements } from "@/lib/api/announcements";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ANNOUNCEMENT_CATEGORY_CODES } from "@/lib/constants/announcement-options";
import { AnnouncementListClient } from "@/components/features/announcements/AnnouncementListClient";
import type { Announcement, AnnouncementCategory } from "@/types/announcement";

export async function AnnouncementList() {
  const [t, locale] = await Promise.all([
    getTranslations("announcements"),
    getLocale(),
  ]);

  const heading = (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("list.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("list.description")}</p>
    </div>
  );

  let announcements: Announcement[];
  try {
    announcements = await getAnnouncements();
  } catch {
    return (
      <div>
        {heading}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("list.error")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categoryLabels = ANNOUNCEMENT_CATEGORY_CODES.reduce(
    (labels, code) => {
      labels[code] = t(`categories.${code}`);
      return labels;
    },
    {} as Record<AnnouncementCategory, string>
  );

  const categoryOptions = ANNOUNCEMENT_CATEGORY_CODES.map((code) => ({
    value: code,
    label: t(`categories.${code}`),
  }));

  return (
    <div>
      {heading}
      <Card>
        <CardContent className="pt-6">
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("list.empty")}</p>
          ) : (
            <AnnouncementListClient
              announcements={announcements}
              categoryLabels={categoryLabels}
              categoryOptions={categoryOptions}
              actionRequiredBadgeLabel={t("actionRequiredBadge")}
              locale={locale}
            />
          )}
        </CardContent>
      </Card>
    </div>
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
