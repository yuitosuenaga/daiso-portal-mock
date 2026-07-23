import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { CompanyForm } from "@/components/features/helpdesk-companies/CompanyForm";
import { getCompanyById } from "@/lib/server/company-service";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";

type HelpdeskCompanyEditPageProps = {
  params: {
    id: string;
  };
};

export default async function HelpdeskCompanyEditPage({
  params,
}: HelpdeskCompanyEditPageProps) {
  const [t, tCountries] = await Promise.all([
    getTranslations("helpdeskCompanies.form"),
    getTranslations("inquiryForm.options.country"),
  ]);

  const company = await getCompanyById(params.id);

  if (!company) {
    return (
      <div className="max-w-2xl space-y-4">
        <BackLink href="/helpdesk/companies" label={t("backToList")} />
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

  return (
    <div className="max-w-2xl space-y-4">
      <BackLink href="/helpdesk/companies" label={t("backToList")} />
      <h1 className="text-2xl font-semibold text-foreground">{t("editTitle")}</h1>
      <CompanyForm
        mode="edit"
        companyId={company.id}
        defaultValues={{
          name: company.name,
          country: company.country,
          companyCode: company.companyCode,
        }}
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
