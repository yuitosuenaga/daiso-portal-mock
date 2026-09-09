import { getTranslations, getLocale } from "next-intl/server";
import { getAllManuals } from "@/lib/api/manuals";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { DOCUMENT_COMPANY_OPTIONS } from "@/lib/constants/document-company-options";
import { ManualManagementListClient } from "@/components/features/helpdesk-manuals/ManualManagementListClient";
import {
  ManagementListHeading,
  ManagementListMessageCard,
  ManagementListSkeleton,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { Manual } from "@/types/manual";

export async function ManualManagementList() {
  const [t, tCountries, locale] = await Promise.all([
    getTranslations("helpdeskManuals.list"),
    getTranslations("inquiryForm.options.country"),
    getLocale(),
  ]);

  const heading = (
    <ManagementListHeading
      title={t("title")}
      description={t("description")}
      addHref="/helpdesk/manuals/new"
      addLabel={t("newButton")}
    />
  );

  let manuals: Manual[];
  try {
    manuals = await getAllManuals();
  } catch {
    return (
      <div>
        {heading}
        <ManagementListMessageCard message={t("error")} />
      </div>
    );
  }

  if (manuals.length === 0) {
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

  const companyLabels = DOCUMENT_COMPANY_OPTIONS.reduce(
    (labels, option) => {
      labels[option.code] = `${option.companyName} (${countryLabels[option.country] ?? option.country})`;
      return labels;
    },
    {} as Record<string, string>
  );

  return (
    <div>
      {heading}
      <ManualManagementListClient
        manuals={manuals}
        locale={locale}
        listTitle={t("title")}
        editLinkLabel={t("editLink")}
        categoryLabel={t("categoryLabel")}
        revisionLabel={t("revisionLabel")}
        sourceTypeUploadBadgeLabel={t("sourceTypeUploadBadge")}
        sourceTypeGoogleBadgeLabel={t("sourceTypeGoogleBadge")}
        targetingLabels={{
          allLabel: t("targetingAllLabel"),
          countriesLabel: t("targetingCountriesLabel"),
          companiesLabel: t("targetingCompaniesLabel"),
          countryLabels,
          companyLabels,
        }}
      />
    </div>
  );
}

export function ManualManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
