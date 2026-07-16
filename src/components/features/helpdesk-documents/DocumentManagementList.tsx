import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAllDocuments } from "@/lib/api/documents";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { DOCUMENT_COMPANY_OPTIONS } from "@/lib/constants/document-company-options";
import { formatFileSize } from "@/lib/attachment-utils";
import { targetingLabel } from "@/lib/document-utils";
import { DeleteDocumentButton } from "@/components/features/helpdesk-documents/DeleteDocumentButton";
import {
  ManagementListCard,
  ManagementListHeading,
  ManagementListMessageCard,
  ManagementListRow,
  ManagementListRows,
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
      <ManagementListCard title={t("title")}>
        <ManagementListRows>
          {documents.map((document) => (
            <ManagementListRow key={document.id}>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{document.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded border border-input px-1.5 py-0.5">
                    {document.sourceType === "google"
                      ? t("sourceTypeGoogleBadge")
                      : t("sourceTypeUploadBadge")}
                  </span>
                  {document.sourceType === "upload" && (
                    <span>{formatFileSize(document.fileSize)}</span>
                  )}
                  <time dateTime={document.uploadedAt}>
                    {new Date(document.uploadedAt).toLocaleDateString(
                      locale,
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                  </time>
                  <span>
                    {targetingLabel(document.targeting, {
                      allLabel: t("targetingAllLabel"),
                      countriesLabel: t("targetingCountriesLabel"),
                      companiesLabel: t("targetingCompaniesLabel"),
                      countryLabels,
                      companyLabels,
                    })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/helpdesk/documents/${document.id}/edit`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {t("editLink")}
                </Link>
                <DeleteDocumentButton
                  documentId={document.id}
                  deleteButtonLabel={t("deleteButton")}
                  confirmMessage={t("deleteConfirm")}
                  errorMessage={t("deleteError")}
                />
              </div>
            </ManagementListRow>
          ))}
        </ManagementListRows>
      </ManagementListCard>
    </div>
  );
}

export function DocumentManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
