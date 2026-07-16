import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { ApplicantUserForm } from "@/components/features/helpdesk-companies/ApplicantUserForm";
import { getCompanyById } from "@/lib/server/company-service";

type HelpdeskApplicantUserNewPageProps = {
  params: {
    id: string;
  };
};

export default async function HelpdeskApplicantUserNewPage({
  params,
}: HelpdeskApplicantUserNewPageProps) {
  const [t, tCompanyForm] = await Promise.all([
    getTranslations("helpdeskCompanies.applicantUserForm"),
    getTranslations("helpdeskCompanies.form"),
  ]);

  const company = await getCompanyById(params.id);

  if (!company) {
    return (
      <div className="max-w-2xl space-y-4">
        <BackLink href="/helpdesk/companies" label={t("backToDetail")} />
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {tCompanyForm("notFound")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <BackLink
        href={`/helpdesk/companies/${company.id}`}
        label={t("backToDetail")}
      />
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {t("createTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{company.name}</p>
      </div>
      <ApplicantUserForm
        mode="create"
        companyId={company.id}
        emailLabel={t("emailLabel")}
        emailPlaceholder={t("emailPlaceholder")}
        displayNameLabel={t("displayNameLabel")}
        displayNamePlaceholder={t("displayNamePlaceholder")}
        passwordLabel={t("passwordLabel")}
        passwordPlaceholder={t("passwordCreatePlaceholder")}
        passwordHint={t("passwordCreateHint")}
        submitButtonLabel={t("submitButton")}
        requiredErrorMessage={t("validation.required")}
        emailInvalidMessage={t("validation.emailInvalid")}
        emailDuplicateMessage={t("validation.emailDuplicate")}
        passwordTooShortMessage={t("validation.passwordTooShort")}
        submitErrorMessage={t("submitError")}
      />
    </div>
  );
}
