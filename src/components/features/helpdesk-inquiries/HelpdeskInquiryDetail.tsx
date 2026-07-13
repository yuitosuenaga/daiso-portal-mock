import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/ui/back-link";
import { getInquiryById } from "@/lib/api/inquiries";
import { getInquiryHistory } from "@/lib/api/inquiry-history";
import { getReplyTemplatesByCategory } from "@/lib/api/reply-templates";
import { ClaimToggleButton } from "@/components/features/helpdesk-inquiries/ClaimToggleButton";
import { StatusSelect } from "@/components/features/helpdesk-inquiries/StatusSelect";
import { ReplyForm } from "@/components/features/helpdesk-inquiries/ReplyForm";
import { HistoryTimeline } from "@/components/features/helpdesk-inquiries/HistoryTimeline";
import { AttachmentPreviewList } from "@/components/features/helpdesk-inquiries/AttachmentPreviewList";
import { INQUIRY_STATUS_CODES } from "@/lib/constants/inquiry-options";
import type { Inquiry } from "@/types/inquiry";

export async function HelpdeskInquiryDetail({ id }: { id: string }) {
  const [t, tStatuses, tCategories, tUrgencies, tCountries, tClaim, tStatus, tReply, tHistory, locale] =
    await Promise.all([
      getTranslations("helpdeskInquiries"),
      getTranslations("inquiryList.status"),
      getTranslations("inquiryForm.options.category"),
      getTranslations("inquiryForm.options.urgency"),
      getTranslations("inquiryForm.options.country"),
      getTranslations("helpdeskInquiries.claim"),
      getTranslations("helpdeskInquiries.status"),
      getTranslations("helpdeskInquiries.reply"),
      getTranslations("helpdeskInquiries.history"),
      getLocale(),
    ]);

  const backToListLink = (
    <BackLink href="/helpdesk/inquiries" label={t("detail.backToList")} />
  );

  let inquiry: Inquiry | null;
  try {
    inquiry = await getInquiryById(id);
  } catch {
    return (
      <div className="space-y-4">
        {backToListLink}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t("detail.error")}
            </p>
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
            <p className="text-sm text-muted-foreground">
              {t("detail.notFound")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [history, templates] = await Promise.all([
    getInquiryHistory(inquiry.id),
    getReplyTemplatesByCategory(inquiry.category),
  ]);

  const statusOptions = INQUIRY_STATUS_CODES.map((code) => ({
    value: code,
    label: tStatuses(code),
  }));

  return (
    <div className="space-y-4">
      {backToListLink}
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>
            {inquiry.submittedBy.companyName} / {tCategories(inquiry.category)}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Badge variant={`urgency-${inquiry.urgency}`}>
                {tUrgencies(inquiry.urgency)}
              </Badge>
            </span>
            <span className="flex items-center gap-2">
              <Badge variant={`status-${inquiry.status}`}>
                {tStatuses(inquiry.status)}
              </Badge>
            </span>
            <span>{tCountries(inquiry.submittedBy.country)}</span>
            <span>{inquiry.storeRegion}</span>
            <time dateTime={inquiry.createdAt}>
              {new Date(inquiry.createdAt).toLocaleString(locale, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {inquiry.originalLanguage !== "ja" && inquiry.translatedText ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("detail.translatedTextLabel")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {inquiry.translatedText}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("detail.originalTextLabel")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {inquiry.originalText}
                </p>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {inquiry.originalText}
            </p>
          )}
          {inquiry.attachments && inquiry.attachments.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("detail.attachmentsLabel")}
              </p>
              <AttachmentPreviewList attachments={inquiry.attachments} />
            </div>
          )}
          <ClaimToggleButton
            inquiryId={inquiry.id}
            claim={inquiry.claim}
            claimButtonLabel={tClaim("claimButton")}
            releaseButtonLabel={tClaim("releaseButton")}
            claimedByLabel={tClaim("claimedByLabel")}
            errorMessage={tClaim("error")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tStatus("sectionTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusSelect
            inquiryId={inquiry.id}
            status={inquiry.status}
            label={tStatus("label")}
            options={statusOptions}
            errorMessage={tStatus("error")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tReply("sectionTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReplyForm
            inquiryId={inquiry.id}
            templates={templates}
            templateLabel={tReply("templateLabel")}
            templatePlaceholder={tReply("templatePlaceholder")}
            noTemplatesMessage={tReply("noTemplates")}
            bodyLabel={tReply("bodyLabel")}
            bodyPlaceholder={tReply("bodyPlaceholder")}
            submitButtonLabel={tReply("submitButton")}
            submittingLabel={tReply("submitting")}
            successMessage={tReply("successMessage")}
            errorMessage={tReply("error")}
            attachmentsLabel={tReply("attachments.label")}
            attachmentsHint={tReply("attachments.hint")}
            attachmentsRemoveButtonLabel={tReply("attachments.removeButton")}
            attachmentsSizeExceededMessage={tReply(
              "attachments.sizeExceeded"
            )}
            attachmentsTypeNotAllowedMessage={tReply(
              "attachments.typeNotAllowed"
            )}
            attachmentsCountExceededMessage={tReply(
              "attachments.countExceeded"
            )}
            attachmentsReadFailedMessage={tReply("attachments.readFailed")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {tHistory("sectionTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HistoryTimeline
            entries={history}
            emptyMessage={tHistory("empty")}
            typeLabels={{
              claimed: tHistory("types.claimed"),
              released: tHistory("types.released"),
              status_changed: tHistory("types.status_changed"),
              reply_sent: tHistory("types.reply_sent"),
              requester_message: tHistory("types.requester_message"),
            }}
            locale={locale}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function HelpdeskInquiryDetailSkeleton() {
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </div>
  );
}
