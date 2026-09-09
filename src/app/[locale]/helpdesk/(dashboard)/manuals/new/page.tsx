import { getTranslations, getLocale } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { ManualForm } from "@/components/features/helpdesk-manuals/ManualForm";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { DOCUMENT_COMPANY_OPTIONS } from "@/lib/constants/document-company-options";
import { MANUAL_CATEGORIES } from "@/lib/constants/manual";
import { buildMonthOptions } from "@/lib/category-year-month-filter";

export default async function HelpdeskManualNewPage() {
  const [t, tCategories, tCountries, tInquiryForm, locale] = await Promise.all([
    getTranslations("helpdeskManuals.form"),
    getTranslations("manuals.categories"),
    getTranslations("inquiryForm.options.country"),
    getTranslations("inquiryForm"),
    getLocale(),
  ]);

  const countryOptions = INQUIRY_COUNTRY_CODES.map((code) => ({
    value: code,
    label: tCountries(code),
  }));

  const companyOptions = DOCUMENT_COMPANY_OPTIONS.map((option) => ({
    value: option.code,
    label: `${tCountries(option.country)} - ${option.companyName}`,
  }));

  const categoryOptions = MANUAL_CATEGORIES.map((category) => ({
    value: category,
    label: tCategories(category),
  }));

  const monthOptions = buildMonthOptions(locale);

  return (
    <div className="max-w-2xl space-y-4">
      <BackLink href="/helpdesk/manuals" label={t("backToList")} />
      <h1 className="text-2xl font-semibold text-foreground">{t("createTitle")}</h1>
      <ManualForm
        mode="create"
        countryOptions={countryOptions}
        companyOptions={companyOptions}
        categoryOptions={categoryOptions}
        monthOptions={monthOptions}
        categoryLabel={t("categoryLabel")}
        categoryPlaceholderOption={t("categoryPlaceholderOption")}
        categoryRequiredErrorMessage={t("validation.categoryRequired")}
        titleLabel={t("titleLabel")}
        titlePlaceholder={t("titlePlaceholder")}
        descriptionLabel={t("descriptionLabel")}
        descriptionPlaceholder={t("descriptionPlaceholder")}
        languageJaTabLabel={t("language.jaTab")}
        languageEnTabLabel={t("language.enTab")}
        yearLabel={t("yearLabel")}
        monthLabel={t("monthLabel")}
        targetingLabel={t("targetingLabel")}
        targetingAllOption={t("targetingAllOption")}
        targetingCountriesOption={t("targetingCountriesOption")}
        targetingCompaniesOption={t("targetingCompaniesOption")}
        countriesLabel={t("countriesLabel")}
        companiesLabel={t("companiesLabel")}
        sourceTypeLabel={t("sourceTypeLabel")}
        sourceTypeUploadOption={t("sourceTypeUploadOption")}
        sourceTypeGoogleOption={t("sourceTypeGoogleOption")}
        fileLabel={t("fileLabel")}
        fileHint={t("fileHint")}
        removeFileButtonLabel={t("removeButtonLabel")}
        googleUrlLabel={t("googleUrlLabel")}
        googleUrlPlaceholder={t("googleUrlPlaceholder")}
        googleUrlHint={t("googleUrlHint")}
        submitButtonLabel={t("submitButton")}
        requiredErrorMessage={t("validation.required")}
        countriesRequiredErrorMessage={t("validation.countriesRequired")}
        companiesRequiredErrorMessage={t("validation.companiesRequired")}
        fileRequiredErrorMessage={t("validation.fileRequired")}
        sizeExceededMessage={t("validation.sizeExceeded")}
        typeNotAllowedMessage={t("validation.typeNotAllowed")}
        readFailedMessage={t("validation.readFailed")}
        googleUrlInvalidMessage={t("validation.googleUrlInvalid")}
        requiredIndicator={tInquiryForm("requiredMark")}
        submitErrorMessage={t("submitError")}
      />
    </div>
  );
}
