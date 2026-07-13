import { getTranslations, getLocale } from "next-intl/server";
import { getAnnouncementById } from "@/lib/api/announcements";
import {
  getAnnouncementSelfStatus,
  isReminderPendingForCompany,
} from "@/lib/api/announcement-tracking";
import { requireApplicantSession } from "@/lib/server/auth-session";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/ui/back-link";
import { ReminderBadge } from "@/components/features/announcements/ReminderBadge";
import { AnnouncementSelfReportPanel } from "@/components/features/announcements/AnnouncementSelfReportPanel";

export async function AnnouncementDetail({ id }: { id: string }) {
  const [t, tCategories, tAnnouncements, locale] = await Promise.all([
    getTranslations("announcements.detail"),
    getTranslations("announcements.categories"),
    getTranslations("announcements"),
    getLocale(),
  ]);

  const backToListLink = <BackLink href="/announcements" label={t("backToList")} />;

  let announcement;
  let companyCode: string;
  try {
    const { claims } = await requireApplicantSession();
    companyCode = claims.companyCode;
    announcement = await getAnnouncementById(id);
  } catch {
    return (
      <div className="space-y-4">
        {backToListLink}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("error")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="space-y-4">
        {backToListLink}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("notFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [isReminderPending, selfStatus] = await Promise.all([
    isReminderPendingForCompany(announcement.id, companyCode),
    getAnnouncementSelfStatus(announcement.id),
  ]);

  return (
    <div className="space-y-4">
      {backToListLink}
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
          <AnnouncementSelfReportPanel
            announcementId={announcement.id}
            actionRequired={announcement.actionRequired}
            initialStatus={selfStatus}
          />
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {announcement.body}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AnnouncementDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-24" />
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
    </div>
  );
}
