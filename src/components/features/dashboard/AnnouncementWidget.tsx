import { getTranslations, getLocale } from "next-intl/server";
import { getRecentAnnouncements } from "@/lib/api/announcements";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export async function AnnouncementWidget() {
  const [t, locale] = await Promise.all([
    getTranslations("dashboard.announcements"),
    getLocale(),
  ]);

  let announcements;
  try {
    announcements = await getRecentAnnouncements({ limit: 3 });
  } catch {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("error")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {announcements.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 text-sm"
              >
                <span className="flex-1 line-clamp-2">{item.title}</span>
                <time
                  dateTime={item.publishedAt}
                  className="shrink-0 text-muted-foreground text-xs"
                >
                  {new Date(item.publishedAt).toLocaleDateString(locale, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AnnouncementWidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}
