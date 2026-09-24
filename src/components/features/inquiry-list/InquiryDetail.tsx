import { getTranslations, getLocale } from "next-intl/server";
import { getInquiryById } from "@/lib/api/inquiries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/ui/back-link";
import { InquiryHistoryList } from "@/components/features/inquiry-list/InquiryHistoryList";
import { ApplicantMessageForm } from "@/components/features/inquiry-list/ApplicantMessageForm";
import { MarkInquiryRead } from "@/components/features/inquiry-list/MarkInquiryRead";
import { AttachmentPreviewList } from "@/components/features/helpdesk-inquiries/AttachmentPreviewList";
import { resolveInquiryContent } from "@/lib/inquiry-content";

export async function InquiryDetail({ id }: { id: string }) {
  const [t, tStatuses, tCategories, tUrgencies, tCountries, tMessage, locale] =
    await Promise.all([
      getTranslations("inquiryList.detail"),
      getTranslations("inquiryList.status"),
      getTranslations("inquiryForm.options.category"),
      getTranslations("inquiryForm.options.urgency"),
      getTranslations("inquiryForm.options.country"),
      getTranslations("inquiryList.message"),
      getLocale(),
    ]);

  const backToListLink = <BackLink href="/inquiry" label={t("backToList")} />;

  let inquiry;
  try {
    inquiry = await getInquiryById(id);
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

  if (!inquiry) {
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

  const historySection = await InquiryHistoryList({ inquiryId: inquiry.id });
  const resolvedContent = resolveInquiryContent(inquiry, locale);
  const translationNeeded = inquiry.originalLanguage !== locale;

  return (
    <div className="space-y-4">
      <MarkInquiryRead inquiryId={inquiry.id} />
      {backToListLink}
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>{resolvedContent.title || t("untitled")}</CardTitle>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>
              {t("categoryLabel")}: {tCategories(inquiry.category)}
            </span>
            <span className="flex items-center gap-2">
              {t("urgencyLabel")}:{" "}
              <Badge variant={`urgency-${inquiry.urgency}`}>
                {tUrgencies(inquiry.urgency)}
              </Badge>
            </span>
            <span className="flex items-center gap-2">
              {t("statusLabel")}:{" "}
              <Badge variant={`status-${inquiry.status}`}>
                {tStatuses(inquiry.status)}
              </Badge>
              {inquiry.claim && (
                <Badge variant="status-in_progress">
                  {t("inProgressBadge")}
                </Badge>
              )}
            </span>
            <span>
              {t("storeRegionLabel")}: {inquiry.storeRegion}
            </span>
            <span>
              {t("createdAtLabel")}:{" "}
              <time dateTime={inquiry.createdAt}>
                {new Date(inquiry.createdAt).toLocaleString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {translationNeeded && resolvedContent.isTranslated ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("translatedTextLabel")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {resolvedContent.body}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("originalTextLabel")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {inquiry.originalText}
                </p>
              </div>
            </div>
          ) : translationNeeded && !resolvedContent.isTranslated ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("translationUnavailable")}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {inquiry.originalText}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("originalTextLabel")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                {inquiry.originalText}
              </p>
            </div>
          )}
          {inquiry.attachments && inquiry.attachments.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("attachmentsLabel")}
              </p>
              <div className="mt-1">
                <AttachmentPreviewList attachments={inquiry.attachments} />
              </div>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("submittedByLabel")}
            </p>
            <p className="mt-1 text-sm leading-relaxed">
              {inquiry.submittedBy.companyName} /{" "}
              {tCountries(inquiry.submittedBy.country)}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">{historySection}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tMessage("sectionTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicantMessageForm
            inquiryId={inquiry.id}
            bodyLabel={tMessage("bodyLabel")}
            bodyPlaceholder={tMessage("bodyPlaceholder")}
            submitButtonLabel={tMessage("submitButton")}
            submittingLabel={tMessage("submitting")}
            successMessage={tMessage("successMessage")}
            errorMessage={tMessage("error")}
            attachmentsLabel={tMessage("attachments.label")}
            attachmentsHint={tMessage("attachments.hint")}
            attachmentsRemoveButtonLabel={tMessage("attachments.removeButton")}
            attachmentsSizeExceededMessage={tMessage(
              "attachments.sizeExceeded"
            )}
            attachmentsTypeNotAllowedMessage={tMessage(
              "attachments.typeNotAllowed"
            )}
            attachmentsCountExceededMessage={tMessage(
              "attachments.countExceeded"
            )}
            attachmentsReadFailedMessage={tMessage("attachments.readFailed")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function InquiryDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-24" />
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-3/4" />
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    </div>
  );
}
