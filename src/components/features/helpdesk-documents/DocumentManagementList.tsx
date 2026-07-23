import { getTranslations, getLocale } from "next-intl/server";
import { getAllDocuments } from "@/lib/api/documents";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { DOCUMENT_COMPANY_OPTIONS } from "@/lib/constants/document-company-options";
import { DocumentManagementListClient } from "@/components/features/helpdesk-documents/DocumentManagementListClient";
import {
  ManagementListHeading,
  ManagementListMessageCard,
  ManagementListSkeleton,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { Document } from "@/types/document";

export async function DocumentManagementList() {
  const [t, tCountries, locale] = await Promise.all([
    getTranslations("helpdeskDocuments.list"),
    getTranslations("inquiryForm.options.country"),
    getLocale(),
  ]);

  const heading = (
    <ManagementListHeading
      title={t("title")}
      description={t("description")}
      addHref="/helpdesk/documents/new"
      addLabel={t("addButton")}
    />
  );

  let documents: Document[];
  try {
    documents = await getAllDocuments();
  } catch {
    return (
      <div>
        {heading}
        <ManagementListMessageCard message={t("error")} />
      </div>
    );
  }

  if (documents.length === 0) {
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
      <DocumentManagementListClient
        documents={documents}
        locale={locale}
        listTitle={t("title")}
        editLinkLabel={t("editLink")}
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

export function DocumentManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
