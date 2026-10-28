import { createPageMetadata } from "@/lib/page-metadata";
import { getTranslations } from "next-intl/server";
import { requireHelpdeskAdminPage } from "@/lib/server/require-helpdesk-admin-page";
import { BackLink } from "@/components/ui/back-link";
import { CompanyForm } from "@/components/features/helpdesk-companies/CompanyForm";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";

export const generateMetadata = createPageMetadata("helpdeskCompanies", "form.createTitle");

export default async function HelpdeskCompanyNewPage() {
  await requireHelpdeskAdminPage();
  const [t, tCountries] = await Promise.all([
    getTranslations("helpdeskCompanies.form"),
    getTranslations("inquiryForm.options.country"),
  ]);

  const countryOptions = INQUIRY_COUNTRY_CODES.map((code) => ({
    value: code,
    label: tCountries(code),
  }));

  return (
    <div className="max-w-2xl space-y-4">
      <BackLink href="/helpdesk/companies" label={t("backToList")} />
      <h1 className="text-2xl font-semibold text-foreground">
        {t("createTitle")}
      </h1>
      <CompanyForm
        mode="create"
        countryOptions={countryOptions}
        nameLabel={t("nameLabel")}
        namePlaceholder={t("namePlaceholder")}
        countryLabel={t("countryLabel")}
        countryPlaceholder={t("countryPlaceholder")}
        companyCodeLabel={t("companyCodeLabel")}
        companyCodePlaceholder={t("companyCodePlaceholder")}
        companyCodeHelpText={t("companyCodeHelpText")}
        submitButtonLabel={t("submitButton")}
        requiredErrorMessage={t("validation.required")}
        companyCodeFormatErrorMessage={t("validation.companyCodeFormat")}
        companyCodeDuplicateMessage={t("validation.companyCodeDuplicate")}
        submitErrorMessage={t("submitError")}
      />
    </div>
  );
}
