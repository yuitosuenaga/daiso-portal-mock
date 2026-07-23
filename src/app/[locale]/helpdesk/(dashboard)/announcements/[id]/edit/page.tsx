import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { AnnouncementForm } from "@/components/features/helpdesk-announcements/AnnouncementForm";
import { DeleteAnnouncementButton } from "@/components/features/helpdesk-announcements/DeleteAnnouncementButton";
import { getAnnouncementByIdForHelpdesk } from "@/lib/api/announcements";
import { getAllDocuments } from "@/lib/api/documents";
import { ANNOUNCEMENT_CATEGORY_CODES } from "@/lib/constants/announcement-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import type { AnnouncementFormValues } from "@/lib/validation/announcement";

type HelpdeskAnnouncementEditPageProps = {
  params: {
    id: string;
  };
};

export default async function HelpdeskAnnouncementEditPage({
  params,
}: HelpdeskAnnouncementEditPageProps) {
  const [t, tListLabels, tCategories, tCountries, tInquiryForm, tDocuments] =
    await Promise.all([
      getTranslations("helpdeskAnnouncements.form"),
      getTranslations("helpdeskAnnouncements.list"),
      getTranslations("announcements.categories"),
      getTranslations("inquiryForm.options.country"),
      getTranslations("inquiryForm"),
      getTranslations("documents.list"),
    ]);

  const backToListLink = (
    <BackLink href="/helpdesk/announcements" label={t("backToList")} />
  );

  const announcement = await getAnnouncementByIdForHelpdesk(params.id);

  if (!announcement) {
    return (
      <div className="max-w-2xl space-y-4">
        {backToListLink}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("notFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categoryOptions = ANNOUNCEMENT_CATEGORY_CODES.map((code) => ({
    value: code,
    label: tCategories(code),
  }));

  const countryOptions = INQUIRY_COUNTRY_CODES.map((code) => ({
    value: code,
    label: tCountries(code),
  }));

  const documentOptions = await getAllDocuments();

  const enTranslation = announcement.translations.find(
    (translation) => translation.locale === "en"
  );
  const additionalTranslations = announcement.translations.filter(
    (translation) => translation.locale !== "en"
  );

  return (
    <div className="max-w-2xl space-y-4">
      {backToListLink}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          {t("editTitle")}
        </h1>
        <DeleteAnnouncementButton
          announcementId={announcement.id}
          announcementTitle={announcement.title}
          deleteButtonLabel={tListLabels("deleteButton")}
          confirmTitle={tListLabels("deleteConfirmTitle")}
          confirmDescription={tListLabels("deleteConfirm", {
            title: announcement.title,
          })}
          confirmLabel={tListLabels("deleteConfirmButton")}
          cancelLabel={tListLabels("deleteCancelButton")}
          errorMessage={tListLabels("deleteError")}
        />
      </div>
      <AnnouncementForm
        mode="edit"
        announcementId={announcement.id}
        defaultValues={{
          title: announcement.title,
          body: announcement.body,
          titleEn: enTranslation?.title ?? "",
          bodyEn: enTranslation?.body ?? "",
          translations: additionalTranslations,
          category: announcement.category,
          status: announcement.status,
          // `Announcement.targeting.countries`はドメイン型として`string[]`だが、
          // 保存済みデータは常に`announcementFormSchema`で検証済みのため、
          // フォームの厳密な国コード型へ安全に絞り込める。
          targeting: announcement.targeting as AnnouncementFormValues["targeting"],
          actionRequired: announcement.actionRequired,
          publishStartDate: announcement.publishStartDate ?? "",
          publishEndDate: announcement.publishEndDate ?? "",
          dueDate: announcement.dueDate ?? "",
          // `Announcement.attachments`の`fileType`はドメイン型として`string`だが、
          // 保存済みデータは常に`announcementFormSchema`で検証済みのため、
          // フォームの厳密なMIMEタイプ型へ安全に絞り込める。
          attachments: announcement.attachments as AnnouncementFormValues["attachments"],
          linkedDocumentIds: announcement.linkedDocumentIds,
        }}
        categoryOptions={categoryOptions}
        countryOptions={countryOptions}
        documentOptions={documentOptions}
        titleLabel={t("titleLabel")}
        titlePlaceholder={t("titlePlaceholder")}
        bodyLabel={t("bodyLabel")}
        bodyPlaceholder={t("bodyPlaceholder")}
        languageJaTabLabel={t("language.jaTab")}
        languageEnTabLabel={t("language.enTab")}
        languageAddButtonLabel={t("language.addButton")}
        languageRemoveButtonLabel={t("language.removeButton")}
        languageLocaleCodeLabel={t("language.localeCodeLabel")}
        languageLocaleCodePlaceholder={t("language.localeCodePlaceholder")}
        languageLocaleDuplicateErrorMessage={t("language.localeDuplicateError")}
        categoryLabel={t("categoryLabel")}
        categoryPlaceholder={t("categoryPlaceholder")}
        statusLabel={t("statusLabel")}
        statusDraftOption={t("statusDraftOption")}
        statusPublishedOption={t("statusPublishedOption")}
        actionRequiredLabel={t("actionRequiredLabel")}
        actionRequiredTrueOption={t("actionRequiredTrueOption")}
        actionRequiredFalseOption={t("actionRequiredFalseOption")}
        targetingLabel={t("targetingLabel")}
        targetingAllOption={t("targetingAllOption")}
        targetingCountriesOption={t("targetingCountriesOption")}
        countriesLabel={t("countriesLabel")}
        countriesSearchPlaceholder={t("countriesSearchPlaceholder")}
        countriesSelectAllButtonLabel={t("countriesSelectAllButtonLabel")}
        countriesClearAllButtonLabel={t("countriesClearAllButtonLabel")}
        countriesSelectedCountLabel={t.raw("countriesSelectedCountLabel")}
        countriesNoResultsMessage={t("countriesNoResultsMessage")}
        countriesRemoveChipButtonLabel={t("countriesRemoveChipButtonLabel")}
        publishStartDateLabel={t("publishStartDateLabel")}
        publishEndDateLabel={t("publishEndDateLabel")}
        publishPeriodHint={t("publishPeriodHint")}
        publishEndDateBeforeStartErrorMessage={t("validation.publishEndDateBeforeStart")}
        dueDateLabel={t("dueDateLabel")}
        dueDateRequiredErrorMessage={t("validation.dueDateRequired")}
        submitButtonLabel={t("submitButton")}
        requiredErrorMessage={t("validation.required")}
        countriesRequiredErrorMessage={t("validation.countriesRequired")}
        requiredIndicator={tInquiryForm("requiredMark")}
        submitErrorMessage={t("submitError")}
        attachmentsLabel={t("attachmentsLabel")}
        attachmentsHint={t("attachmentsHint")}
        attachmentsRemoveButtonLabel={t("attachmentsRemoveButtonLabel")}
        attachmentsSizeExceededMessage={t("validation.attachmentsSizeExceeded")}
        attachmentsTypeNotAllowedMessage={t("validation.attachmentsTypeNotAllowed")}
        attachmentsCountExceededMessage={t("validation.attachmentsCountExceeded")}
        attachmentsReadFailedMessage={t("validation.attachmentsReadFailed")}
        downloadLinkLabel={tDocuments("downloadLink")}
        openOriginalLinkLabel={tDocuments("openOriginalLink")}
        linkedDocumentsLabel={t("linkedDocumentsLabel")}
        linkedDocumentsPickButtonLabel={t("linkedDocumentsPickButtonLabel")}
        linkedDocumentsEmptyMessage={t("linkedDocumentsEmptyMessage")}
        linkedDocumentRemoveButtonLabel={t("linkedDocumentRemoveButtonLabel")}
        linkedDocumentsDialogTitle={t("linkedDocumentsDialogTitle")}
        linkedDocumentsDialogConfirmLabel={t("linkedDocumentsDialogConfirmLabel")}
        linkedDocumentsDialogCancelLabel={t("linkedDocumentsDialogCancelLabel")}
        linkedDocumentsDialogNoDocumentsMessage={t("linkedDocumentsDialogNoDocumentsMessage")}
        linkedDocumentsTargetingAllLabel={t("linkedDocumentsTargetingAllLabel")}
        linkedDocumentsTargetingCountriesPrefixLabel={t(
          "linkedDocumentsTargetingCountriesPrefixLabel"
        )}
        linkedDocumentsTargetingCompaniesPrefixLabel={t(
          "linkedDocumentsTargetingCompaniesPrefixLabel"
        )}
      />
    </div>
  );
}
