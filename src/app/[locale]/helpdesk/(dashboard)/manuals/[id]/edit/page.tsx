import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { ManualForm } from "@/components/features/helpdesk-manuals/ManualForm";
import { getManualByIdForHelpdesk } from "@/lib/api/manuals";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { DOCUMENT_COMPANY_OPTIONS } from "@/lib/constants/document-company-options";
import { MANUAL_CATEGORIES } from "@/lib/constants/manual";
import { buildMonthOptions } from "@/lib/category-year-month-filter";
import type { ManualFormValues } from "@/lib/validation/manual";

type HelpdeskManualEditPageProps = {
  params: {
    id: string;
  };
};

export default async function HelpdeskManualEditPage({
  params,
}: HelpdeskManualEditPageProps) {
  const [t, tCategories, tCountries, tInquiryForm, locale] = await Promise.all([
    getTranslations("helpdeskManuals.form"),
    getTranslations("manuals.categories"),
    getTranslations("inquiryForm.options.country"),
    getTranslations("inquiryForm"),
    getLocale(),
  ]);

  const backToListLink = (
    <BackLink href="/helpdesk/manuals" label={t("backToList")} />
  );

  const manual = await getManualByIdForHelpdesk(params.id);

  if (!manual) {
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

  const enTranslation = manual.translations.find(
    (translation) => translation.locale === "en"
  );

  const defaultValues: ManualFormValues =
    manual.sourceType === "google"
      ? {
          sourceType: "google",
          title: manual.title,
          description: manual.description,
          titleEn: enTranslation?.title,
          descriptionEn: enTranslation?.description,
          category: manual.category,
          year: manual.year,
          month: manual.month,
          googleUrl: manual.googleUrl,
          googleEmbedUrl: manual.googleEmbedUrl,
          // `Manual.targeting`はドメイン型として`string[]`だが、保存済みデータは常に
          // `manualFormSchema`のenum値のいずれかであるため、フォーム入力型へキャストする
          // （`DocumentDetailPanel`の`document.targeting as DocumentFormValues["targeting"]`と同型）。
          targeting: manual.targeting as ManualFormValues["targeting"],
        }
      : {
          sourceType: "upload",
          title: manual.title,
          description: manual.description,
          titleEn: enTranslation?.title,
          descriptionEn: enTranslation?.description,
          category: manual.category,
          year: manual.year,
          month: manual.month,
          fileName: manual.fileName,
          fileType: manual.fileType,
          fileSize: manual.fileSize,
          dataUrl: manual.dataUrl,
          // `Manual.targeting`はドメイン型として`string[]`だが、保存済みデータは常に
          // `manualFormSchema`のenum値のいずれかであるため、フォーム入力型へキャストする
          // （`DocumentDetailPanel`の`document.targeting as DocumentFormValues["targeting"]`と同型）。
          targeting: manual.targeting as ManualFormValues["targeting"],
        };

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
      {backToListLink}
      <h1 className="text-2xl font-semibold text-foreground">{t("editTitle")}</h1>
      <ManualForm
        mode="edit"
        manualId={manual.id}
        defaultValues={defaultValues}
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
