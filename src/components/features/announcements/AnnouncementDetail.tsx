import { getTranslations, getLocale } from "next-intl/server";
import { getAnnouncementById } from "@/lib/api/announcements";
import { isReminderPendingForCompany } from "@/lib/api/announcement-tracking";
import { requireApplicantSession } from "@/lib/server/auth-session";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ReminderBadge } from "@/components/features/announcements/ReminderBadge";
import { Link } from "@/i18n/navigation";

export async function AnnouncementDetail({ id }: { id: string }) {
  const [t, tCategories, tAnnouncements, locale] = await Promise.all([
    getTranslations("announcements.detail"),
    getTranslations("announcements.categories"),
    getTranslations("announcements"),
    getLocale(),
  ]);

  const backToListLink = (
    <Link
      href="/announcements"
      className="text-sm text-primary underline-offset-4 hover:underline"
    >
      {t("backToList")}
    </Link>
  );

  let announcement;
  let companyCode: string;
  try {
    const { claims } = await requireApplicantSession();
    companyCode = claims.companyCode;
    announcement = await getAnnouncementById(id);
  } catch {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("error")}</p>
          </CardContent>
        </Card>
        {backToListLink}
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("notFound")}</p>
          </CardContent>
        </Card>
        {backToListLink}
      </div>
    );
  }

  const isReminderPending = await isReminderPendingForCompany(
    announcement.id,
    companyCode
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>{announcement.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>
              {t("publishedAtLabel")}:{" "}
              <time dateTime={announcement.publishedAt!}>
                {new Date(announcement.publishedAt!).toLocaleDateString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </span>
            <span className="flex items-center gap-2">
              {t("categoryLabel")}:{" "}
              <Badge variant={announcement.category}>
                {tCategories(announcement.category)}
              </Badge>
            </span>
            {announcement.actionRequired && (
              <Badge variant="default">
                {tAnnouncements("actionRequiredBadge")}
              </Badge>
            )}
            {announcement.actionRequired && announcement.dueDate && (
              <span>
                {tAnnouncements("dueDateLabel")}:{" "}
                <time dateTime={announcement.dueDate}>
                  {new Date(announcement.dueDate).toLocaleDateString(locale, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </span>
            )}
            {isReminderPending && <ReminderBadge isPending={isReminderPending} />}
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {announcement.body}
          </p>
        </CardContent>
      </Card>
      {backToListLink}
    </div>
  );
}

export function AnnouncementDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
      <Skeleton className="h-4 w-24" />
    </div>
  );
}
