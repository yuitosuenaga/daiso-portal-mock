import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listCompaniesForManagement } from "@/lib/server/company-service";
import {
  ManagementListHeading,
  ManagementListMessageCard,
  ManagementListSkeleton,
} from "@/components/features/helpdesk-shared/ManagementList";
import { CompanyManagementListClient } from "@/components/features/helpdesk-companies/CompanyManagementListClient";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import type { CompanyWithStats } from "@/types/company";

/** 販社管理一覧（要件1.1〜1.7）。取得失敗・0件時のメッセージ表示を含む。 */
export async function CompanyManagementList() {
  const [t, tImport, tBulkDeactivate, tCountries, locale] = await Promise.all([
    getTranslations("helpdeskCompanies.list"),
    getTranslations("helpdeskCompanies.import"),
    getTranslations("helpdeskCompanies.bulkDeactivate"),
    getTranslations("inquiryForm.options.country"),
    getLocale(),
  ]);

  const heading = (
    <div className="mb-2 space-y-2">
      <ManagementListHeading
        title={t("title")}
        description={t("description")}
        addHref="/helpdesk/companies/new"
        addLabel={t("addButton")}
      />
      <div className="flex justify-end">
        <Link
          href="/helpdesk/companies/import"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {tImport("title")}
        </Link>
      </div>
    </div>
  );

  let companies: CompanyWithStats[];
  try {
    companies = await listCompaniesForManagement();
  } catch {
    return (
      <div>
        {heading}
        <ManagementListMessageCard message={t("error")} />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div>
        {heading}
        <ManagementListMessageCard message={t("empty")} />
      </div>
    );
  }

  const countryLabels = INQUIRY_COUNTRY_CODES.reduce(
    (labels, code) => {
      labels[code] = tCountries(code);
      return labels;
    },
    {} as Record<string, string>
  );

  return (
    <div>
      {heading}
      <CompanyManagementListClient
        companies={companies}
        countryLabels={countryLabels}
        locale={locale}
        searchLabel={t("searchLabel")}
        searchPlaceholder={t("searchPlaceholder")}
        nameHeader={t("nameHeader")}
        countryHeader={t("countryHeader")}
        companyCodeHeader={t("companyCodeHeader")}
        applicantUserCountHeader={t("applicantUserCountHeader")}
        detailLink={t("detailLink")}
        noResultsMessage={t("noResults")}
        selectAllLabel={tBulkDeactivate("selectAllLabel")}
        selectRowLabelTemplate={tBulkDeactivate("selectRowLabel")}
        selectedCountTemplate={tBulkDeactivate("selectedCount")}
        bulkDeactivateButtonLabel={tBulkDeactivate("bulkDeactivateButton")}
        confirmTitle={tBulkDeactivate("confirmTitle")}
        confirmMessageTemplate={tBulkDeactivate("confirmMessage")}
        confirmButtonLabel={tBulkDeactivate("confirmButton")}
        cancelButtonLabel={tBulkDeactivate("cancelButton")}
        successMessageTemplate={tBulkDeactivate("successMessage")}
        errorMessage={tBulkDeactivate("errorMessage")}
      />
    </div>
  );
}

export function CompanyManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
