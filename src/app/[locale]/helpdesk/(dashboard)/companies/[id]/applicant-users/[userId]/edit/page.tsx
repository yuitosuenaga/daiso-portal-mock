import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { ApplicantUserForm } from "@/components/features/helpdesk-companies/ApplicantUserForm";
import { ToggleApplicantUserActiveButton } from "@/components/features/helpdesk-companies/ToggleApplicantUserActiveButton";
import { getCompanyById } from "@/lib/server/company-service";
import { getApplicantUserById } from "@/lib/server/applicant-user-service";

type HelpdeskApplicantUserEditPageProps = {
  params: {
    id: string;
    userId: string;
  };
};

export default async function HelpdeskApplicantUserEditPage({
  params,
}: HelpdeskApplicantUserEditPageProps) {
  const [t, tCompanyForm, tToggle] = await Promise.all([
    getTranslations("helpdeskCompanies.applicantUserForm"),
    getTranslations("helpdeskCompanies.form"),
    getTranslations("helpdeskCompanies.toggleActive"),
  ]);

  const company = await getCompanyById(params.id);
  const applicantUser = company ? await getApplicantUserById(params.userId) : null;

  if (!company || !applicantUser || applicantUser.companyId !== company.id) {
    return (
      <div className="max-w-2xl space-y-4">
        <BackLink
          href={company ? `/helpdesk/companies/${company.id}` : "/helpdesk/companies"}
          label={t("backToDetail")}
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {company ? t("notFound") : tCompanyForm("notFound")}
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {t("editTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{company.name}</p>
        </div>
        <ToggleApplicantUserActiveButton
          applicantUserId={applicantUser.id}
          isActive={applicantUser.isActive}
          deactivateButtonLabel={tToggle("deactivateButton")}
          activateButtonLabel={tToggle("activateButton")}
          deactivateConfirmMessage={tToggle("deactivateConfirm")}
          activateConfirmMessage={tToggle("activateConfirm")}
          errorMessage={tToggle("toggleError")}
        />
      </div>
      <ApplicantUserForm
        mode="edit"
        companyId={company.id}
        applicantUserId={applicantUser.id}
        defaultValues={{
          email: applicantUser.email,
          displayName: applicantUser.displayName,
        }}
        emailLabel={t("emailLabel")}
        emailPlaceholder={t("emailPlaceholder")}
        displayNameLabel={t("displayNameLabel")}
        displayNamePlaceholder={t("displayNamePlaceholder")}
        passwordLabel={t("passwordLabel")}
        passwordPlaceholder={t("passwordEditPlaceholder")}
        passwordHint={t("passwordEditHint")}
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
