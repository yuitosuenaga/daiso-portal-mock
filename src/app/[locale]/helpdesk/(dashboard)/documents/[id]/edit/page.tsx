import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { DocumentDetailPanel } from "@/components/features/helpdesk-documents/DocumentDetailPanel";
import { getDocumentByIdForHelpdesk } from "@/lib/api/documents";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { DOCUMENT_COMPANY_OPTIONS } from "@/lib/constants/document-company-options";

type HelpdeskDocumentEditPageProps = {
  params: {
    id: string;
  };
};

export default async function HelpdeskDocumentEditPage({
  params,
}: HelpdeskDocumentEditPageProps) {
  const [t, tListLabels, tCountries, tInquiryForm, locale] = await Promise.all([
    getTranslations("helpdeskDocuments.form"),
    getTranslations("helpdeskDocuments.list"),
    getTranslations("inquiryForm.options.country"),
    getTranslations("inquiryForm"),
    getLocale(),
  ]);

  const backToListLink = (
    <BackLink href="/helpdesk/documents" label={t("backToList")} />
  );

  const document = await getDocumentByIdForHelpdesk(params.id);

  if (!document) {
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

  const countryOptions = INQUIRY_COUNTRY_CODES.map((code) => ({
    value: code,
    label: tCountries(code),
  }));

  const companyOptions = DOCUMENT_COMPANY_OPTIONS.map((option) => ({
    value: option.code,
    label: `${tCountries(option.country)} - ${option.companyName}`,
  }));

  const countryLabels = INQUIRY_COUNTRY_CODES.reduce(
    (labels, code) => {
      labels[code] = tCountries(code);
      return labels;
    },
    {} as Record<string, string>
  );

  const companyLabels = DOCUMENT_COMPANY_OPTIONS.reduce(
    (labels, option) => {
      labels[option.code] = `${option.companyName} (${countryLabels[option.country] ?? option.country})`;
      return labels;
    },
    {} as Record<string, string>
  );

  return (
    <div className="max-w-2xl space-y-4">
      <DocumentDetailPanel
        document={document}
        locale={locale}
        detailTitleLabel={t("detailTitle")}
        editTitleLabel={t("editTitle")}
        editButtonLabel={t("editButton")}
        cancelButtonLabel={t("cancelButton")}
        backToListLabel={t("backToList")}
        fileSizeLabel={tListLabels("fileSizeLabel")}
        uploadedAtLabel={tListLabels("uploadedAtLabel")}
        downloadLinkLabel={t("downloadLink")}
        targetingAllLabel={tListLabels("targetingAllLabel")}
        targetingCountriesLabel={tListLabels("targetingCountriesLabel")}
        targetingCompaniesLabel={tListLabels("targetingCompaniesLabel")}
        countryLabels={countryLabels}
        companyLabels={companyLabels}
        deleteButtonLabel={tListLabels("deleteButton")}
        deleteConfirmMessage={tListLabels("deleteConfirm")}
        deleteErrorMessage={tListLabels("deleteError")}
        formProps={{
          countryOptions,
          companyOptions,
          titleLabel: t("titleLabel"),
          titlePlaceholder: t("titlePlaceholder"),
          descriptionLabel: t("descriptionLabel"),
          descriptionPlaceholder: t("descriptionPlaceholder"),
          targetingLabel: t("targetingLabel"),
          targetingAllOption: t("targetingAllOption"),
          targetingCountriesOption: t("targetingCountriesOption"),
          targetingCompaniesOption: t("targetingCompaniesOption"),
          countriesLabel: t("countriesLabel"),
          companiesLabel: t("companiesLabel"),
          fileLabel: t("fileLabel"),
          fileHint: t("fileHint"),
          removeFileButtonLabel: t("removeButtonLabel"),
          submitButtonLabel: t("submitButton"),
          requiredErrorMessage: t("validation.required"),
          countriesRequiredErrorMessage: t("validation.countriesRequired"),
          companiesRequiredErrorMessage: t("validation.companiesRequired"),
          fileRequiredErrorMessage: t("validation.fileRequired"),
          sizeExceededMessage: t("validation.sizeExceeded"),
          typeNotAllowedMessage: t("validation.typeNotAllowed"),
          readFailedMessage: t("validation.readFailed"),
          requiredIndicator: tInquiryForm("requiredMark"),
          submitErrorMessage: t("submitError"),
        }}
      />
    </div>
  );
}
