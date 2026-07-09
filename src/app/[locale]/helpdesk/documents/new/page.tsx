import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DocumentForm } from "@/components/features/helpdesk-documents/DocumentForm";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { DOCUMENT_COMPANY_OPTIONS } from "@/lib/constants/document-company-options";

export default async function HelpdeskDocumentNewPage() {
  const [t, tCountries, tInquiryForm] = await Promise.all([
    getTranslations("helpdeskDocuments.form"),
    getTranslations("inquiryForm.options.country"),
    getTranslations("inquiryForm"),
  ]);

  const countryOptions = INQUIRY_COUNTRY_CODES.map((code) => ({
    value: code,
    label: tCountries(code),
  }));

  const companyOptions = DOCUMENT_COMPANY_OPTIONS.map((option) => ({
    value: option.code,
    label: `${tCountries(option.country)} - ${option.companyName}`,
  }));

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">
        {t("createTitle")}
      </h1>
      <DocumentForm
        mode="create"
        countryOptions={countryOptions}
        companyOptions={companyOptions}
        titleLabel={t("titleLabel")}
        titlePlaceholder={t("titlePlaceholder")}
        descriptionLabel={t("descriptionLabel")}
        descriptionPlaceholder={t("descriptionPlaceholder")}
        targetingLabel={t("targetingLabel")}
        targetingAllOption={t("targetingAllOption")}
        targetingCountriesOption={t("targetingCountriesOption")}
        targetingCompaniesOption={t("targetingCompaniesOption")}
        countriesLabel={t("countriesLabel")}
        companiesLabel={t("companiesLabel")}
        fileLabel={t("fileLabel")}
        fileHint={t("fileHint")}
        removeFileButtonLabel={t("removeButtonLabel")}
        submitButtonLabel={t("submitButton")}
        requiredErrorMessage={t("validation.required")}
        countriesRequiredErrorMessage={t("validation.countriesRequired")}
        companiesRequiredErrorMessage={t("validation.companiesRequired")}
        fileRequiredErrorMessage={t("validation.fileRequired")}
        sizeExceededMessage={t("validation.sizeExceeded")}
        typeNotAllowedMessage={t("validation.typeNotAllowed")}
        readFailedMessage={t("validation.readFailed")}
        requiredIndicator={tInquiryForm("requiredMark")}
        submitErrorMessage={t("submitError")}
      />
      <Link
        href="/helpdesk/documents"
        className="inline-block text-sm text-primary underline-offset-4 hover:underline"
      >
        {t("backToList")}
      </Link>
    </div>
  );
}
