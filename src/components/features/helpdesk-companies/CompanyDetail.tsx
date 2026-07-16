import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { cn } from "@/lib/utils";
import { getCompanyById } from "@/lib/server/company-service";
import { listApplicantUsersByCompany } from "@/lib/server/applicant-user-service";
import { ApplicantUserList } from "@/components/features/helpdesk-companies/ApplicantUserList";

export interface CompanyDetailProps {
  companyId: string;
}

/**
 * 販社詳細画面（要件4.1・4.5・4.6）。会社情報と申請者アカウント一覧
 * （`ApplicantUserList`）を組み立てるServer Component。
 */
export async function CompanyDetail({ companyId }: CompanyDetailProps) {
  const [t, tForm, tToggle, tCountries] = await Promise.all([
    getTranslations("helpdeskCompanies.detail"),
    getTranslations("helpdeskCompanies.form"),
    getTranslations("helpdeskCompanies.toggleActive"),
    getTranslations("inquiryForm.options.country"),
  ]);

  const company = await getCompanyById(companyId);

  if (!company) {
    return (
      <div className="space-y-4">
        <BackLink href="/helpdesk/companies" label={t("backToList")} />
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{tForm("notFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const applicantUsers = await listApplicantUsersByCompany(companyId);

  return (
    <div className="space-y-6">
      <BackLink href="/helpdesk/companies" label={t("backToList")} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {company.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("countryLabel")}: {tCountries(company.country)}
            {"　"}
            {t("companyCodeLabel")}: {company.companyCode}
          </p>
        </div>
        <Link
          href={`/helpdesk/companies/${companyId}/edit`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          {t("editButton")}
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t("applicantUsersTitle")}
          </h2>
          <Link
            href={`/helpdesk/companies/${companyId}/applicant-users/new`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            {t("addApplicantUserButton")}
          </Link>
        </div>
        <ApplicantUserList
          companyId={companyId}
          applicantUsers={applicantUsers}
          emptyMessage={t("applicantUsersEmpty")}
          emailHeader={t("emailHeader")}
          displayNameHeader={t("displayNameHeader")}
          statusHeader={t("statusHeader")}
          activeStatusLabel={t("activeStatus")}
          inactiveStatusLabel={t("inactiveStatus")}
          editLinkLabel={t("editLink")}
          deactivateButtonLabel={tToggle("deactivateButton")}
          activateButtonLabel={tToggle("activateButton")}
          deactivateConfirmMessage={tToggle("deactivateConfirm")}
          activateConfirmMessage={tToggle("activateConfirm")}
          toggleErrorMessage={tToggle("toggleError")}
        />
      </div>
    </div>
  );
}
