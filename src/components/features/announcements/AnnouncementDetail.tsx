import { getTranslations, getLocale } from "next-intl/server";
import { getAnnouncementById } from "@/lib/api/announcements";
import {
  getAnnouncementSelfStatus,
  isReminderPendingForCompany,
} from "@/lib/api/announcement-tracking";
import { getDocumentById } from "@/lib/api/documents";
import { requireApplicantSession } from "@/lib/server/auth-session";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/ui/back-link";
import { ReminderBadge } from "@/components/features/announcements/ReminderBadge";
import { OverdueBadge } from "@/components/features/announcements/OverdueBadge";
import { AnnouncementSelfReportPanel } from "@/components/features/announcements/AnnouncementSelfReportPanel";
import { AttachmentPreviewList } from "@/components/features/helpdesk-inquiries/AttachmentPreviewList";
import { PdfViewer } from "@/components/features/documents/PdfViewer";
import { isAnnouncementDueDateOverdue } from "@/lib/announcement-overdue";
import type { Document } from "@/types/document";

export async function AnnouncementDetail({ id }: { id: string }) {
  const [t, tCategories, tAnnouncements, tDocuments, locale] = await Promise.all([
    getTranslations("announcements.detail"),
    getTranslations("announcements.categories"),
    getTranslations("announcements"),
    getTranslations("documents.list"),
    getLocale(),
  ]);

  const backToListLink = <BackLink href="/announcements" label={t("backToList")} />;

  let announcement;
  let companyCode: string;
  try {
    const { claims } = await requireApplicantSession();
    companyCode = claims.companyCode;
    announcement = await getAnnouncementById(id, { locale });
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

  const [isReminderPending, selfStatus, linkedDocumentResults] = await Promise.all([
    isReminderPendingForCompany(announcement.id, companyCode),
    getAnnouncementSelfStatus(announcement.id),
    Promise.all(
      announcement.linkedDocumentIds.map((documentId) => getDocumentById(documentId))
    ),
  ]);
  const visibleLinkedDocuments = linkedDocumentResults.filter(
    (document): document is Document => document !== null
  );
  const imageAttachments = announcement.attachments.filter((attachment) =>
    attachment.fileType.startsWith("image/")
  );
  const pdfAttachments = announcement.attachments.filter(
    (attachment) => attachment.fileType === "application/pdf"
  );
  const hasAttachments =
    announcement.attachments.length > 0 || visibleLinkedDocuments.length > 0;
  const isOverdue =
    announcement.actionRequired &&
    isAnnouncementDueDateOverdue(announcement.dueDate) &&
    selfStatus.completedAt === null;

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
              <span
                className={isOverdue ? "text-destructive font-medium" : undefined}
              >
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
            <OverdueBadge isOverdue={isOverdue} />
            {isReminderPending && <ReminderBadge isPending={isReminderPending} />}
          </div>
          <AnnouncementSelfReportPanel
            announcementId={announcement.id}
            actionRequired={announcement.actionRequired}
            initialStatus={selfStatus}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {announcement.body}
          </p>
          {hasAttachments && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                {t("attachmentsSectionTitle")}
              </h2>
              <AttachmentPreviewList attachments={imageAttachments} />
              {pdfAttachments.map((attachment) => (
                <PdfViewer
                  key={attachment.id}
                  variant="upload"
                  dataUrl={attachment.dataUrl}
                  title={attachment.fileName}
                  downloadFileName={attachment.fileName}
                  downloadLinkLabel={tDocuments("downloadLink")}
                />
              ))}
              {visibleLinkedDocuments.map((document) =>
                document.sourceType === "google" ? (
                  <PdfViewer
                    key={document.id}
                    variant="google"
                    embedUrl={document.googleEmbedUrl}
                    title={document.title}
                    originalUrl={document.googleUrl}
                    openOriginalLabel={tDocuments("openOriginalLink")}
                  />
                ) : (
                  <PdfViewer
                    key={document.id}
                    variant="upload"
                    dataUrl={document.dataUrl}
                    title={document.title}
                    downloadFileName={document.fileName}
                    downloadLinkLabel={tDocuments("downloadLink")}
                  />
                )
              )}
            </div>
          )}
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
